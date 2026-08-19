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
        String priority) {
}
