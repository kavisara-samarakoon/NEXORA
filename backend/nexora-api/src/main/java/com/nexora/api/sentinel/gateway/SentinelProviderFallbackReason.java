package com.nexora.api.sentinel.gateway;

public enum SentinelProviderFallbackReason {
    GEMINI_NOT_CONFIGURED("gemini_not_configured"),
    GEMINI_AUTH_FAILED("gemini_auth_failed"),
    GEMINI_MODEL_UNAVAILABLE("gemini_model_unavailable"),
    GEMINI_RATE_LIMITED("gemini_rate_limited"),
    GEMINI_NON_SUCCESS_RESPONSE("gemini_non_success_response"),
    GEMINI_INVALID_RESPONSE("gemini_invalid_response"),
    GEMINI_TIMEOUT_OR_NETWORK("gemini_timeout_or_network"),
    GEMINI_CONFIGURATION_INVALID("gemini_configuration_invalid"),
    GEMINI_UNAVAILABLE("gemini_unavailable"),
    UNKNOWN("unknown");

    private final String apiValue;

    SentinelProviderFallbackReason(String apiValue) {
        this.apiValue = apiValue;
    }

    public String apiValue() {
        return apiValue;
    }
}
