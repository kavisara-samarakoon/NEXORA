package com.nexora.api.deals;

import java.math.BigDecimal;

record ExternalDealsCacheKey(int pageSize, String title, String upperPrice) {

    static ExternalDealsCacheKey of(int pageSize, String normalizedTitle, BigDecimal upperPrice) {
        return new ExternalDealsCacheKey(
                pageSize,
                normalizedTitle == null ? "" : normalizedTitle,
                upperPrice == null ? "" : upperPrice.stripTrailingZeros().toPlainString()
        );
    }
}
