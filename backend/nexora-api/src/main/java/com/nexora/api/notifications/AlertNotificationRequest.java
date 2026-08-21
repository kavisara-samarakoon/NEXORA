package com.nexora.api.notifications;

public record AlertNotificationRequest(
        long userId,
        long wishlistItemId,
        String itemTitle,
        String store,
        String currentPrice,
        String targetPrice,
        String evaluationState,
        String message
) {
}
