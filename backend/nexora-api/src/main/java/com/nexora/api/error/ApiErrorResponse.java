package com.nexora.api.error;

import java.time.Instant;

public record ApiErrorResponse(
        String error,
        String message,
        int status,
        String path,
        Instant timestampUtc,
        Long retryAfterSeconds) {
}
