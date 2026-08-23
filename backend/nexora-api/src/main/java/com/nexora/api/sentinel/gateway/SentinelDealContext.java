package com.nexora.api.sentinel.gateway;

public record SentinelDealContext(
        String title,
        String store,
        String priceNew,
        String priceOld,
        int discountValue,
        String discount,
        String status,
        String category) {
}
