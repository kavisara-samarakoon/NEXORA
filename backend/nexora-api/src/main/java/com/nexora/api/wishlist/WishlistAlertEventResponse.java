package com.nexora.api.wishlist;

import java.time.LocalDateTime;

public record WishlistAlertEventResponse(
        long id,
        long wishlistItemId,
        String itemTitle,
        String store,
        String currentPrice,
        String targetPrice,
        String evaluationState,
        boolean targetReached,
        String message,
        LocalDateTime createdAt
) {
}
