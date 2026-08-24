package com.nexora.api.sentinel.gateway;

public record SentinelGatewayErrorResponse(
        String error,
        String message,
        Long retryAfterSeconds) {

    SentinelGatewayErrorResponse(String error, String message) {
        this(error, message, null);
    }
}
