package com.nexora.api.wishlist;

import java.math.BigDecimal;
import java.time.LocalDateTime;

record NewWishlistPriceHistoryEntry(
        long userId,
        long wishlistItemId,
        String itemTitle,
        String store,
        String priceLabel,
        BigDecimal priceAmount,
        String currency,
        String source,
        LocalDateTime observedAt) {
}
