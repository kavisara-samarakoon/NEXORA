package com.nexora.api.sentinel.gateway;

import com.nexora.api.deals.Deal;
import com.nexora.api.deals.DealCatalogService;
import com.nexora.api.giveaways.Giveaway;
import com.nexora.api.giveaways.GiveawayCatalogService;
import com.nexora.api.wishlist.UserWishlistService;
import com.nexora.api.wishlist.WishlistAlertEventResponse;
import com.nexora.api.wishlist.WishlistItem;
import com.nexora.api.wishlist.WishlistPriceHistoryPoint;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.stream.IntStream;

@Service
public class SentinelContextSummaryService {

    static final int MAX_WISHLIST_ITEMS = 5;
    static final int MAX_DEALS = 5;
    static final int MAX_GIVEAWAYS = 5;
    static final int MAX_ALERT_EVENTS = 3;
    static final int MAX_PRICE_HISTORY_ITEMS = 3;
    static final int MAX_PRICE_HISTORY_POINTS = 3;

    private final UserWishlistService userWishlistService;
    private final DealCatalogService dealCatalogService;
    private final GiveawayCatalogService giveawayCatalogService;

    public SentinelContextSummaryService(
            UserWishlistService userWishlistService,
            DealCatalogService dealCatalogService,
            GiveawayCatalogService giveawayCatalogService) {
        this.userWishlistService = userWishlistService;
        this.dealCatalogService = dealCatalogService;
        this.giveawayCatalogService = giveawayCatalogService;
    }

    public SentinelContextSummary summarize(long userId, SentinelInsightContext context) {
        return switch (context) {
            case WISHLIST -> wishlistSummary(userId);
            case DEALS -> dealsSummary();
            case GENERAL -> generalSummary(userId);
            case SECURITY -> SentinelContextSummary.empty(SentinelInsightContext.SECURITY);
        };
    }

    private SentinelContextSummary wishlistSummary(long userId) {
        List<WishlistItem> allItems = userWishlistService.getWishlistItems(userId);
        List<WishlistAlertEventResponse> allAlerts =
                userWishlistService.getWishlistAlertEvents(userId);
        List<WishlistItem> selectedItems = allItems.stream()
                .limit(MAX_WISHLIST_ITEMS)
                .toList();

        List<SentinelWishlistContext> items = IntStream.range(0, selectedItems.size())
                .mapToObj(index -> wishlistContext(userId, selectedItems.get(index), index))
                .toList();
        List<SentinelAlertContext> alerts = allAlerts.stream()
                .limit(MAX_ALERT_EVENTS)
                .map(SentinelContextSummaryService::alertContext)
                .toList();

        return new SentinelContextSummary(
                SentinelInsightContext.WISHLIST,
                allItems.size(),
                (int) allItems.stream().filter(WishlistItem::alertActive).count(),
                allAlerts.size(),
                0,
                0,
                items,
                alerts,
                List.of(),
                List.of());
    }

    private SentinelWishlistContext wishlistContext(long userId, WishlistItem item, int index) {
        List<SentinelPriceHistoryContext> prices = index < MAX_PRICE_HISTORY_ITEMS
                ? userWishlistService.getWishlistPriceHistory(
                                userId, item.id(), MAX_PRICE_HISTORY_POINTS).stream()
                        .limit(MAX_PRICE_HISTORY_POINTS)
                        .map(SentinelContextSummaryService::priceContext)
                        .toList()
                : List.of();
        return new SentinelWishlistContext(
                item.title(),
                item.store(),
                item.currentPrice(),
                item.targetPrice(),
                item.alertActive(),
                item.priority(),
                item.status(),
                item.alertEvaluation() == null ? null : item.alertEvaluation().state(),
                item.alertEvaluation() == null ? null : item.alertEvaluation().message(),
                prices);
    }

    private SentinelContextSummary dealsSummary() {
        List<Deal> allDeals = dealCatalogService.getDeals();
        List<SentinelDealContext> deals = allDeals.stream()
                .sorted(Comparator.comparingInt(Deal::discountValue).reversed())
                .limit(MAX_DEALS)
                .map(SentinelContextSummaryService::dealContext)
                .toList();
        return new SentinelContextSummary(
                SentinelInsightContext.DEALS,
                0, 0, 0, allDeals.size(), 0,
                List.of(), List.of(), deals, List.of());
    }

    private SentinelContextSummary generalSummary(long userId) {
        List<WishlistItem> wishlistItems = userWishlistService.getWishlistItems(userId);
        List<Deal> deals = dealCatalogService.getDeals();
        List<Giveaway> giveaways = giveawayCatalogService.getGiveaways();
        List<Giveaway> liveGiveaways = giveaways.stream()
                .filter(giveaway -> "live".equalsIgnoreCase(giveaway.status()))
                .toList();
        List<SentinelGiveawayContext> selectedGiveaways = liveGiveaways.stream()
                .sorted(Comparator.comparingInt(Giveaway::daysRemaining))
                .limit(MAX_GIVEAWAYS)
                .map(SentinelContextSummaryService::giveawayContext)
                .toList();

        return new SentinelContextSummary(
                SentinelInsightContext.GENERAL,
                wishlistItems.size(),
                (int) wishlistItems.stream().filter(WishlistItem::alertActive).count(),
                0,
                deals.size(),
                liveGiveaways.size(),
                List.of(), List.of(), List.of(), selectedGiveaways);
    }

    private static SentinelPriceHistoryContext priceContext(WishlistPriceHistoryPoint point) {
        return new SentinelPriceHistoryContext(
                point.priceLabel(),
                point.priceAmount(),
                point.currency(),
                point.source(),
                point.observedAt());
    }

    private static SentinelAlertContext alertContext(WishlistAlertEventResponse event) {
        return new SentinelAlertContext(
                event.itemTitle(),
                event.store(),
                event.currentPrice(),
                event.targetPrice(),
                event.evaluationState(),
                event.targetReached(),
                event.message(),
                event.createdAt());
    }

    private static SentinelDealContext dealContext(Deal deal) {
        return new SentinelDealContext(
                deal.title(),
                deal.store(),
                deal.priceNew(),
                deal.priceOld(),
                deal.discountValue(),
                deal.discount(),
                deal.status(),
                deal.category());
    }

    private static SentinelGiveawayContext giveawayContext(Giveaway giveaway) {
        return new SentinelGiveawayContext(
                giveaway.title(),
                giveaway.platformLabel(),
                giveaway.timer(),
                giveaway.daysRemaining(),
                giveaway.originalPrice(),
                giveaway.tag());
    }
}
