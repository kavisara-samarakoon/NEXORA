package com.nexora.api.sentinel.gateway;

public class SentinelRateLimitExceededException extends RuntimeException {

    private final long retryAfterSeconds;

    SentinelRateLimitExceededException(long retryAfterSeconds) {
        super("Sentinel request rate limit exceeded");
        this.retryAfterSeconds = Math.max(1, retryAfterSeconds);
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
