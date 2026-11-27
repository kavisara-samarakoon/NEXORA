package com.nexora.api.deals;

import java.math.BigDecimal;

public record ExternalDealsCacheKey(
        int pageSize,
        String title,
        String upperPrice,
        String sortBy,
        boolean desc,
        String storeId,
        int pageNumber
) {

    public static ExternalDealsCacheKey of(int pageSize, String normalizedTitle, BigDecimal upperPrice) {
        return of(pageSize, normalizedTitle, upperPrice, "DealRating", true, null, 0);
    }

    public static ExternalDealsCacheKey of(
            int pageSize,
            String normalizedTitle,
            BigDecimal upperPrice,
            String sortBy,
            boolean desc,
            String storeId,
            int pageNumber) {
        return new ExternalDealsCacheKey(
                pageSize,
                normalizedTitle == null ? "" : normalizedTitle,
                upperPrice == null ? "" : upperPrice.stripTrailingZeros().toPlainString(),
                CheapSharkDealClient.normalizeSortBy(sortBy),
                desc,
                storeId == null ? "" : storeId.trim(),
                Math.max(0, Math.min(pageNumber, 20))
        );
    }
}
