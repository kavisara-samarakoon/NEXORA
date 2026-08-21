package com.nexora.api.wishlist;

public record WishlistPriceRefreshSummary(
        int scannedItems,
        int refreshedItems,
        int targetReachedEventsCreated,
        int skippedItems
) {
}
