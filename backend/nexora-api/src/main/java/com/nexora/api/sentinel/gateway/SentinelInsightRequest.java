package com.nexora.api.sentinel.gateway;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Pattern;

public record SentinelInsightRequest(
        String message,
        @Pattern(
                regexp = "general|wishlist|deals|security",
                message = "must be one of: general, wishlist, deals, security")
        String context) {

    public static final int MAX_MESSAGE_LENGTH = 500;

    @AssertTrue(message = "message must contain between 1 and 500 characters")
    public boolean isMessageValid() {
        if (message == null) {
            return false;
        }
        int length = message.trim().length();
        return length >= 1 && length <= MAX_MESSAGE_LENGTH;
    }
}
