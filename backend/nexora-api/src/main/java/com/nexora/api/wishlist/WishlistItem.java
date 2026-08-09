package com.nexora.api.wishlist;

public record WishlistItem(
        long id,
        String title,
        String store,
        String currentPrice,
        String targetPrice,
        String lowestEver,
        String discount,
        String status,
        boolean alertActive,
        String priority
) {
}

