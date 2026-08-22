package com.nexora.api.wishlist;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record WishlistPriceHistoryPoint(
        long id,
        long wishlistItemId,
        String itemTitle,
        String store,
        String priceLabel,
        BigDecimal priceAmount,
        String currency,
        String source,
        LocalDateTime observedAt) {
}
