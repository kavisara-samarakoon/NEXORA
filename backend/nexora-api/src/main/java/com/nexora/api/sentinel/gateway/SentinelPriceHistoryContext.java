package com.nexora.api.sentinel.gateway;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record SentinelPriceHistoryContext(
        String priceLabel,
        BigDecimal priceAmount,
        String currency,
        String source,
        LocalDateTime observedAt) {
}
