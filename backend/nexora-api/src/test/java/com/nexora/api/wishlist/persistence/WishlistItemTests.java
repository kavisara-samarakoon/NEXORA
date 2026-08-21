package com.nexora.api.wishlist.persistence;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class WishlistItemTests {

    @Test
    void updatesCurrentPriceOnlyForTrimmedNonblankValues() {
        WishlistItem item = item("$30.00");

        item.updateCurrentPrice(null);
        item.updateCurrentPrice("   ");
        assertEquals("$30.00", item.getCurrentPrice());

        item.updateCurrentPrice("  $20.00  ");
        assertEquals("$20.00", item.getCurrentPrice());
    }

    private static WishlistItem item(String currentPrice) {
        return new WishlistItem(
                1L,
                "New Game",
                "Steam",
                currentPrice,
                "$20.00",
                "$25.00",
                null,
                "tracking",
                true,
                "medium",
                true,
                7L
        );
    }
}
