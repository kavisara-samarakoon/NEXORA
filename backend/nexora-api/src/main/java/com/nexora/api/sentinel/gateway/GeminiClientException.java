package com.nexora.api.sentinel.gateway;

class GeminiClientException extends RuntimeException {

    private final SentinelProviderFallbackReason reason;

    GeminiClientException(String message, SentinelProviderFallbackReason reason) {
        super(message);
        this.reason = reason;
    }

    GeminiClientException(
            String message,
            SentinelProviderFallbackReason reason,
            Throwable cause) {
        super(message, cause);
        this.reason = reason;
    }

    SentinelProviderFallbackReason reason() {
        return reason;
    }
}
