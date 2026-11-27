package com.nexora.api.deals;

import java.math.BigDecimal;
import java.time.Instant;

public record Deal(
        long id,
        String store,
        String discount,
        int discountValue,
        String title,
        String priceOld,
        String priceNew,
        BigDecimal priceValue,
        BigDecimal rating,
        String stars,
        String category,
        String status,
        String dealUrl,
        String thumbUrl,
        String currency,
        String gameId,
        String externalDealId,
        String steamAppId,
        Integer metacriticScore,
        String source,
        Instant observedAtUtc
) {

    public Deal(
            long id,
            String store,
            String discount,
            int discountValue,
            String title,
            String priceOld,
            String priceNew,
            BigDecimal priceValue,
            BigDecimal rating,
            String stars,
            String category,
            String status,
            String dealUrl) {
        this(
                id,
                store,
                discount,
                discountValue,
                title,
                priceOld,
                priceNew,
                priceValue,
                rating,
                stars,
                category,
                status,
                dealUrl,
                null,
                "USD",
                null,
                null,
                null,
                null,
                "curated",
                null
        );
    }
}
