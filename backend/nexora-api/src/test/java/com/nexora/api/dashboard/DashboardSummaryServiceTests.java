package com.nexora.api.dashboard;

import com.nexora.api.deals.Deal;
import com.nexora.api.deals.DealCatalogService;
import com.nexora.api.giveaways.Giveaway;
import com.nexora.api.giveaways.GiveawayCatalogService;
import com.nexora.api.wishlist.WishlistCatalogService;
import com.nexora.api.wishlist.WishlistItem;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;

class DashboardSummaryServiceTests {

    @Test
    void summarizesCurrentDevProfileCatalogData() {
        DealCatalogService deals = () -> List.of(
                deal(1, "First deal", 25),
                deal(2, "Best deal", 75)
        );
        GiveawayCatalogService giveaways = () -> List.of(giveaway());
        WishlistCatalogService wishlist = () -> List.of(
                wishlistItem(1, true),
                wishlistItem(2, false)
        );
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("dev");

        DashboardSummary summary = new DashboardSummaryService(
                deals, giveaways, wishlist, environment).getSummary();

        assertAll(
                () -> assertEquals(2, summary.activeDealsCount()),
                () -> assertEquals(1, summary.activeGiveawaysCount()),
                () -> assertEquals(2, summary.wishlistItemsCount()),
                () -> assertEquals(1, summary.activePriceAlertsCount()),
                () -> assertEquals(75, summary.bestDiscountValue()),
                () -> assertEquals("Best deal", summary.bestDiscountTitle()),
                () -> assertEquals("PostgreSQL Connected", summary.databaseStatus()),
                () -> assertEquals("Local NEXORA guidance", summary.sentinelStatus())
        );
    }

    @Test
    void returnsEmptyDealDefaults() {
        DashboardSummary summary = new DashboardSummaryService(
                List::of,
                List::of,
                List::of,
                new MockEnvironment()
        ).getSummary();

        assertAll(
                () -> assertEquals(0, summary.activeDealsCount()),
                () -> assertEquals(0, summary.bestDiscountValue()),
                () -> assertEquals("No active deals", summary.bestDiscountTitle()),
                () -> assertEquals("Demo Mode", summary.databaseStatus())
        );
    }

    private static Deal deal(long id, String title, int discountValue) {
        return new Deal(
                id,
                "Steam",
                "-" + discountValue + "%",
                discountValue,
                title,
                "$20.00",
                "$10.00",
                new BigDecimal("10.00"),
                new BigDecimal("4.5"),
                "★★★★★",
                "RPG",
                "Great Deal",
                null
        );
    }

    private static Giveaway giveaway() {
        return new Giveaway(
                1,
                "steam",
                "Steam",
                "Demo giveaway",
                "Action",
                "1d 00h 00m",
                1,
                50,
                "live",
                "new",
                "$19.99"
        );
    }

    private static WishlistItem wishlistItem(long id, boolean alertActive) {
        return new WishlistItem(
                id,
                "Wishlist item " + id,
                "Steam",
                "$20.00",
                "$10.00",
                "$15.00",
                null,
                "tracking",
                alertActive,
                "medium"
        );
    }
}
