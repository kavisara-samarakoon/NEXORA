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
        LocalDateTime createdAt,
        String deliveryStatus,
        String observationSource
) {

    public WishlistAlertEventResponse(
            long id,
            long wishlistItemId,
            String itemTitle,
            String store,
            String currentPrice,
            String targetPrice,
            String evaluationState,
            boolean targetReached,
            String message,
            LocalDateTime createdAt) {
        this(
                id,
                wishlistItemId,
                itemTitle,
                store,
                currentPrice,
                targetPrice,
                evaluationState,
                targetReached,
                message,
                createdAt,
                "not-delivered",
                null
        );
    }
}
