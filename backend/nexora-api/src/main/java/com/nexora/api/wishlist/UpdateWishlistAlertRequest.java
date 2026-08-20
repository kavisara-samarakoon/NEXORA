package com.nexora.api.wishlist;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UpdateWishlistAlertRequest(
        @Pattern(regexp = "(?s).*\\S.*", message = "must not be blank")
        @Size(max = 255) String targetPrice,
        Boolean alertActive,
        @Pattern(
                regexp = "high|medium|low",
                message = "must be one of: high, medium, low")
        String priority) {

    public UpdateWishlistAlertRequest {
        targetPrice = trimmed(targetPrice);
        priority = trimmed(priority);
    }

    @AssertTrue(message = "at least one alert setting must be provided")
    public boolean isAnyFieldProvided() {
        return targetPrice != null || alertActive != null || priority != null;
    }

    private static String trimmed(String value) {
        return value == null ? null : value.trim();
    }
}
