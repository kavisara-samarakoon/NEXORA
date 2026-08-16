package com.nexora.api.deals;

import java.math.BigDecimal;

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
        String status
) {
}
