package com.nexora.api.wishlist;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AddWishlistItemRequest(
        @NotBlank @Size(max = 255) String title,
        @NotBlank @Size(max = 255) String store,
        @NotBlank @Size(max = 255) String currentPrice,
        @NotBlank @Size(max = 255) String targetPrice,
        @Size(max = 255) String lowestEver,
        @Size(max = 255) String discount,
        @Pattern(
                regexp = "price-drop|free-now|tracking",
                message = "must be one of: price-drop, free-now, tracking")
        String status,
        Boolean alertActive,
        @Pattern(
                regexp = "high|medium|low",
                message = "must be one of: high, medium, low")
        String priority,
        @Size(max = 64) String externalGameId,
        @Size(max = 128) String externalDealId,
        @Pattern(regexp = "^(?:[A-Za-z]{3}|UNKNOWN|unknown)$", message = "must be a 3-letter currency code or UNKNOWN")
        String currency,
        @Size(max = 512) String thumbUrl) {

    public AddWishlistItemRequest(
            String title,
            String store,
            String currentPrice,
            String targetPrice,
            String lowestEver,
            String discount,
            String status,
            Boolean alertActive,
            String priority) {
        this(title, store, currentPrice, targetPrice, lowestEver, discount,
                status, alertActive, priority, null, null, null, null);
    }
}
