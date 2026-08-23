package com.nexora.api.sentinel.gateway;

import com.nexora.api.deals.Deal;
import com.nexora.api.deals.DealCatalogService;
import com.nexora.api.giveaways.Giveaway;
import com.nexora.api.giveaways.GiveawayCatalogService;
import com.nexora.api.wishlist.UserWishlistService;
import com.nexora.api.wishlist.WishlistAlertEvaluation;
import com.nexora.api.wishlist.WishlistAlertEventResponse;
import com.nexora.api.wishlist.WishlistItem;
import com.nexora.api.wishlist.WishlistPriceHistoryPoint;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class SentinelContextSummaryServiceTests {

    private final UserWishlistService wishlistService = mock(UserWishlistService.class);
    private final DealCatalogService dealService = mock(DealCatalogService.class);
    private final GiveawayCatalogService giveawayService = mock(GiveawayCatalogService.class);
    private final SentinelContextSummaryService service = new SentinelContextSummaryService(
            wishlistService, dealService, giveawayService);

    @Test
    void buildsOwnerScopedBoundedWishlistSummaryAndRedactsSensitivePatterns() {
        long userId = 42L;
        List<WishlistItem> items = IntStream.rangeClosed(1, 7)
                .mapToObj(index -> wishlistItem(
                        index,
                        index == 1
                                ? "Game access_token=private-token-value user@example.com"
                                : "Game " + index,
                        index == 1
                                ? "Bearer abcdefghijklmnopqrstuvwxyz"
                                : "Store " + index))
                .toList();
        List<WishlistAlertEventResponse> alerts = IntStream.rangeClosed(1, 5)
                .mapToObj(SentinelContextSummaryServiceTests::alert)
                .toList();
        List<WishlistPriceHistoryPoint> prices = IntStream.rangeClosed(1, 5)
                .mapToObj(SentinelContextSummaryServiceTests::price)
                .toList();
        when(wishlistService.getWishlistItems(userId)).thenReturn(items);
        when(wishlistService.getWishlistAlertEvents(userId)).thenReturn(alerts);
        when(wishlistService.getWishlistPriceHistory(
                eq(userId), anyLong(), eq(SentinelContextSummaryService.MAX_PRICE_HISTORY_POINTS)))
                .thenReturn(prices);

        SentinelContextSummary summary = service.summarize(
                userId, SentinelInsightContext.WISHLIST);
        String prompt = summary.toPromptText();

        assertAll(
                () -> assertEquals(7, summary.activeWishlistItems()),
                () -> assertEquals(5, summary.wishlistItems().size()),
                () -> assertEquals(5, summary.alertEventCount()),
                () -> assertEquals(3, summary.recentAlerts().size()),
                () -> assertEquals(3, summary.wishlistItems().get(0).recentPrices().size()),
                () -> assertEquals(3, summary.wishlistItems().get(2).recentPrices().size()),
                () -> assertTrue(summary.wishlistItems().get(3).recentPrices().isEmpty()),
                () -> assertTrue(prompt.contains("[redacted secret]")),
                () -> assertTrue(prompt.contains("[redacted email]")),
                () -> assertFalse(prompt.contains("private-token-value")),
                () -> assertFalse(prompt.contains("user@example.com")),
                () -> assertFalse(prompt.contains("abcdefghijklmnopqrstuvwxyz")),
                () -> assertTrue(prompt.length() <= SentinelContextSummary.MAX_PROMPT_CHARACTERS)
        );
        verify(wishlistService).getWishlistItems(userId);
        verify(wishlistService).getWishlistAlertEvents(userId);
        verify(wishlistService, never()).getWishlistItems(99L);
        verifyNoInteractions(dealService, giveawayService);
    }

    @Test
    void limitsDealsAndGeneralGiveawaysWhileKeepingOnlyHighLevelGeneralCounts() {
        long userId = 42L;
        List<Deal> deals = IntStream.rangeClosed(1, 8)
                .mapToObj(index -> deal(index, index * 10))
                .toList();
        List<Giveaway> giveaways = IntStream.rangeClosed(1, 7)
                .mapToObj(index -> giveaway(index, "live"))
                .toList();
        when(dealService.getDeals()).thenReturn(deals);
        when(giveawayService.getGiveaways()).thenReturn(giveaways);
        when(wishlistService.getWishlistItems(userId)).thenReturn(List.of(
                wishlistItem(1, "Tracked 1", "Steam"),
                wishlistItem(2, "Tracked 2", "GOG")));

        SentinelContextSummary dealSummary = service.summarize(
                userId, SentinelInsightContext.DEALS);
        SentinelContextSummary generalSummary = service.summarize(
                userId, SentinelInsightContext.GENERAL);

        assertAll(
                () -> assertEquals(8, dealSummary.publicDealCount()),
                () -> assertEquals(5, dealSummary.deals().size()),
                () -> assertEquals(80, dealSummary.deals().get(0).discountValue()),
                () -> assertEquals(7, generalSummary.liveGiveawayCount()),
                () -> assertEquals(5, generalSummary.giveaways().size()),
                () -> assertEquals(2, generalSummary.activeWishlistItems()),
                () -> assertTrue(generalSummary.wishlistItems().isEmpty()),
                () -> assertTrue(generalSummary.deals().isEmpty())
        );
        verify(wishlistService, never()).getWishlistAlertEvents(userId);
        verify(wishlistService, never()).getWishlistPriceHistory(
                eq(userId), anyLong(), eq(SentinelContextSummaryService.MAX_PRICE_HISTORY_POINTS));
    }

    @Test
    void securitySummaryIncludesNoPrivateDataAndDoesNotQueryCatalogs() {
        SentinelContextSummary summary = service.summarize(
                42L, SentinelInsightContext.SECURITY);

        assertAll(
                () -> assertTrue(summary.toPromptText().contains("no credentials")),
                () -> assertTrue(summary.wishlistItems().isEmpty()),
                () -> assertTrue(summary.deals().isEmpty()),
                () -> assertTrue(summary.giveaways().isEmpty())
        );
        verifyNoInteractions(wishlistService, dealService, giveawayService);
    }

    @Test
    void renderedContextHasAHardCharacterLimitAndTruncationMarker() {
        String longValue = "x".repeat(500);
        List<SentinelWishlistContext> items = IntStream.range(0, 5)
                .mapToObj(index -> new SentinelWishlistContext(
                        longValue, longValue, longValue, longValue, true,
                        longValue, longValue, longValue, longValue,
                        List.of(new SentinelPriceHistoryContext(
                                longValue, BigDecimal.ONE, longValue, longValue, LocalDateTime.now()))))
                .toList();
        SentinelContextSummary summary = new SentinelContextSummary(
                SentinelInsightContext.WISHLIST,
                5, 5, 0, 0, 0,
                items, List.of(), List.of(), List.of());

        String prompt = summary.toPromptText();

        assertEquals(SentinelContextSummary.MAX_PROMPT_CHARACTERS, prompt.length());
        assertTrue(prompt.endsWith("[Context truncated to the configured safety limit.]"));
    }

    private static WishlistItem wishlistItem(long id, String title, String store) {
        return new WishlistItem(
                id,
                title,
                store,
                "$19.99",
                "$20.00",
                "$14.99",
                "-50%",
                "Tracked",
                true,
                "High",
                new WishlistAlertEvaluation(true, "TARGET_REACHED", "Target reached"));
    }

    private static WishlistAlertEventResponse alert(int index) {
        return new WishlistAlertEventResponse(
                index,
                index,
                "Game " + index,
                "Steam",
                "$19.99",
                "$20.00",
                "TARGET_REACHED",
                true,
                "Target reached",
                LocalDateTime.of(2026, 8, 24, 0, index));
    }

    private static WishlistPriceHistoryPoint price(int index) {
        return new WishlistPriceHistoryPoint(
                index,
                1,
                "Game",
                "Steam",
                "$" + index + ".00",
                BigDecimal.valueOf(index),
                "USD",
                "price-refresh",
                LocalDateTime.of(2026, 8, 24, 0, index));
    }

    private static Deal deal(int id, int discountValue) {
        return new Deal(
                id,
                "Steam",
                "-" + discountValue + "%",
                discountValue,
                "Deal " + id,
                "$59.99",
                "$19.99",
                new BigDecimal("19.99"),
                new BigDecimal("4.5"),
                "★★★★★",
                "RPG",
                "Great Deal",
                null);
    }

    private static Giveaway giveaway(int id, String status) {
        return new Giveaway(
                id,
                "steam",
                "Steam",
                "Giveaway " + id,
                "Action",
                id + "d",
                id,
                10,
                status,
                "new",
                "$19.99");
    }
}
