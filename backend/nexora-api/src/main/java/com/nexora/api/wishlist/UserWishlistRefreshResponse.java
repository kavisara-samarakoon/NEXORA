package com.nexora.api.wishlist;

import java.time.Instant;
import java.util.List;

public record UserWishlistRefreshResponse(
        int scannedItems,
        int matchedItems,
        int updatedItems,
        int observationsRecorded,
        int targetReachedEventsCreated,
        int unavailableItems,
        String provider,
        String currency,
        Instant refreshedAtUtc,
        boolean hasMore,
        Long nextCursor,
        List<WishlistItem> items
) {

    public UserWishlistRefreshResponse(
            int scannedItems,
            int matchedItems,
            int updatedItems,
            int observationsRecorded,
            int targetReachedEventsCreated,
            int unavailableItems,
            String provider,
            String currency,
            Instant refreshedAtUtc,
            List<WishlistItem> items) {
        this(
                scannedItems,
                matchedItems,
                updatedItems,
                observationsRecorded,
                targetReachedEventsCreated,
                unavailableItems,
                provider,
                currency,
                refreshedAtUtc,
                false,
                null,
                items
        );
    }
}
