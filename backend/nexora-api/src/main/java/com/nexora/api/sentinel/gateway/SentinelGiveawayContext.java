package com.nexora.api.sentinel.gateway;

public record SentinelGiveawayContext(
        String title,
        String platformLabel,
        String timer,
        int daysRemaining,
        String originalPrice,
        String tag) {
}
