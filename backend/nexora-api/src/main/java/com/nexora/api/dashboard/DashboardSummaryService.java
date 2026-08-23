package com.nexora.api.dashboard;

import com.nexora.api.deals.Deal;
import com.nexora.api.deals.DealCatalogService;
import com.nexora.api.giveaways.Giveaway;
import com.nexora.api.giveaways.GiveawayCatalogService;
import com.nexora.api.wishlist.WishlistCatalogService;
import com.nexora.api.wishlist.WishlistItem;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
public class DashboardSummaryService {

    private static final String DEMO_MODE = "Demo Mode";
    private static final String SENTINEL_STATUS = "Gateway Foundation";

    private final DealCatalogService dealCatalogService;
    private final GiveawayCatalogService giveawayCatalogService;
    private final WishlistCatalogService wishlistCatalogService;
    private final Environment environment;

    public DashboardSummaryService(
            DealCatalogService dealCatalogService,
            GiveawayCatalogService giveawayCatalogService,
            WishlistCatalogService wishlistCatalogService,
            Environment environment) {
        this.dealCatalogService = dealCatalogService;
        this.giveawayCatalogService = giveawayCatalogService;
        this.wishlistCatalogService = wishlistCatalogService;
        this.environment = environment;
    }

    public DashboardSummary getSummary() {
        List<Deal> deals = dealCatalogService.getDeals();
        List<Giveaway> giveaways = giveawayCatalogService.getGiveaways();
        List<WishlistItem> wishlistItems = wishlistCatalogService.getWishlistItems();
        Optional<Deal> bestDiscount = deals.stream()
                .max(Comparator.comparingInt(Deal::discountValue));
        int activePriceAlertsCount = (int) wishlistItems.stream()
                .filter(WishlistItem::alertActive)
                .count();

        return new DashboardSummary(
                deals.size(),
                giveaways.size(),
                wishlistItems.size(),
                activePriceAlertsCount,
                bestDiscount.map(Deal::discountValue).orElse(0),
                bestDiscount.map(Deal::title).orElse("No active deals"),
                environment.matchesProfiles("dev") ? "PostgreSQL Connected" : DEMO_MODE,
                SENTINEL_STATUS
        );
    }
}
