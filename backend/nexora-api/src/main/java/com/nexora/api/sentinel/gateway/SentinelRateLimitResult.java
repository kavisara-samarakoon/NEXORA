package com.nexora.api.sentinel.gateway;

public record SentinelRateLimitResult(boolean allowed, long retryAfterSeconds) {

    static SentinelRateLimitResult permitted() {
        return new SentinelRateLimitResult(true, 0);
    }

    static SentinelRateLimitResult rejected(long retryAfterSeconds) {
        return new SentinelRateLimitResult(false, Math.max(1, retryAfterSeconds));
    }
}
