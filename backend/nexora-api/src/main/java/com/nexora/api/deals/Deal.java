package com.nexora.api.deals;

public record Deal(
        long id,
        String store,
        String discount,
        int discountValue,
        String title,
        String priceOld,
        String priceNew,
        double priceValue,
        double rating,
        String stars,
        String category,
        String status
) {
}

