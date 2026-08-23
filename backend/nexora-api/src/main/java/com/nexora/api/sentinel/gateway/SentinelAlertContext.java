package com.nexora.api.sentinel.gateway;

import java.time.LocalDateTime;

public record SentinelAlertContext(
        String itemTitle,
        String store,
        String currentPrice,
        String targetPrice,
        String evaluationState,
        boolean targetReached,
        String message,
        LocalDateTime createdAt) {
}
