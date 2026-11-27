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
        LocalDateTime observedAt,
        String externalGameId,
        String externalDealId) {

    public WishlistPriceHistoryPoint(
            long id,
            long wishlistItemId,
            String itemTitle,
            String store,
            String priceLabel,
            BigDecimal priceAmount,
            String currency,
            String source,
            LocalDateTime observedAt) {
        this(id, wishlistItemId, itemTitle, store, priceLabel,
                priceAmount, currency, source, observedAt, null, null);
    }
}
