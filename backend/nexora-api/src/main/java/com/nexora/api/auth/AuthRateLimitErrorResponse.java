package com.nexora.api.auth;

public record AuthRateLimitErrorResponse(String error, String message, long retryAfterSeconds) {
}
