package com.nexora.api.wishlist;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class WishlistPriceHistoryServiceTests {

    @Test
    void recordsChartReadyNumericAndFreePrices() {
        WishlistPriceHistoryService service = service();

        service.recordSnapshot(7L, item(1L, "$19.99"), "wishlist-create");
        service.recordSnapshot(7L, item(2L, "FREE"), "wishlist-create");

        WishlistPriceHistoryPoint numeric = service.listRecent(7L, 1L, 30).get(0);
        WishlistPriceHistoryPoint free = service.listRecent(7L, 2L, 30).get(0);
        assertAll(
                () -> assertEquals(new BigDecimal("19.99"), numeric.priceAmount()),
                () -> assertEquals("USD", numeric.currency()),
                () -> assertEquals(new BigDecimal("0.00"), free.priceAmount()),
                () -> assertEquals("USD", free.currency())
        );
    }

    @Test
    void preservesUnparseablePriceLabelsWithoutNumericAmount() {
        WishlistPriceHistoryService service = service();

        service.recordSnapshot(7L, item(1L, "TBA"), "wishlist-create");

        WishlistPriceHistoryPoint point = service.listRecent(7L, 1L, 30).get(0);
        assertAll(
                () -> assertEquals("TBA", point.priceLabel()),
                () -> assertNull(point.priceAmount()),
                () -> assertNull(point.currency())
        );
    }

    @Test
    void skipsOnlyConsecutiveDuplicatePricesAndReturnsOldestToNewest() {
        WishlistPriceHistoryService service = service();

        service.recordSnapshot(7L, item(1L, "$30.00"), "wishlist-create");
        service.recordSnapshot(7L, item(1L, "$30.00"), "price-refresh");
        service.recordSnapshot(7L, item(1L, "$25.00"), "price-refresh");

        List<WishlistPriceHistoryPoint> points = service.listRecent(7L, 1L, 30);
        assertAll(
                () -> assertEquals(2, points.size()),
                () -> assertEquals("$30.00", points.get(0).priceLabel()),
                () -> assertEquals("$25.00", points.get(1).priceLabel())
        );
    }

    private static WishlistPriceHistoryService service() {
        return new WishlistPriceHistoryService(new InMemoryWishlistPriceHistoryStore());
    }

    private static WishlistItem item(long id, String currentPrice) {
        return new WishlistItem(
                id,
                "New Game",
                "Steam",
                currentPrice,
                "$20.00",
                "$25.00",
                null,
                "tracking",
                true,
                "medium");
    }
}
