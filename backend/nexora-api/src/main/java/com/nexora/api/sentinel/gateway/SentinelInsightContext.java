package com.nexora.api.sentinel.gateway;

public enum SentinelInsightContext {
    GENERAL("general"),
    WISHLIST("wishlist"),
    DEALS("deals"),
    SECURITY("security");

    private final String apiValue;

    SentinelInsightContext(String apiValue) {
        this.apiValue = apiValue;
    }

    public String apiValue() {
        return apiValue;
    }

    public static SentinelInsightContext fromRequest(String value) {
        if (value == null || value.isBlank()) {
            return GENERAL;
        }

        for (SentinelInsightContext context : values()) {
            if (context.apiValue.equals(value)) {
                return context;
            }
        }
        throw new IllegalArgumentException("Unsupported Sentinel insight context");
    }
}
