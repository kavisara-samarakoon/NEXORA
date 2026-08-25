package com.nexora.api.auth.abuse;

public class AuthRateLimitExceededException extends RuntimeException {

    static final String SAFE_MESSAGE =
            "Too many authentication attempts. Please wait before trying again.";

    private final long retryAfterSeconds;

    AuthRateLimitExceededException(long retryAfterSeconds) {
        super(SAFE_MESSAGE);
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public long retryAfterSeconds() {
        return retryAfterSeconds;
    }
}
