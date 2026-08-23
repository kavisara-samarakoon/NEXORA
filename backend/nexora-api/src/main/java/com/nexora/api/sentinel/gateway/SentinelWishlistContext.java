package com.nexora.api.sentinel.gateway;

import java.util.List;

public record SentinelWishlistContext(
        String title,
        String store,
        String currentPrice,
        String targetPrice,
        boolean alertActive,
        String priority,
        String status,
        String alertState,
        String alertMessage,
        List<SentinelPriceHistoryContext> recentPrices) {

    public SentinelWishlistContext {
        recentPrices = recentPrices == null ? List.of() : List.copyOf(recentPrices);
    }
}
