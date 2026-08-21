package com.nexora.api.wishlist;

import com.nexora.api.wishlist.persistence.WishlistItem;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;

class StoredWishlistPriceSnapshotProviderTests {

    @Test
    void returnsTheAlreadyStoredPriceWithoutExternalWork() {
        WishlistItem item = new WishlistItem(
                1L,
                "New Game",
                "Steam",
                "$30.00",
                "$20.00",
                "$25.00",
                null,
                "tracking",
                true,
                "medium",
                true,
                7L
        );

        Optional<String> price =
                new StoredWishlistPriceSnapshotProvider().findCurrentPrice(item);

        assertEquals(Optional.of("$30.00"), price);
    }
}
