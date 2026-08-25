package com.nexora.api.auth.abuse;

public record AuthAbuseDecision(boolean allowed, long retryAfterSeconds) {

    static AuthAbuseDecision permitted() {
        return new AuthAbuseDecision(true, 0);
    }

    static AuthAbuseDecision rejected(long retryAfterSeconds) {
        return new AuthAbuseDecision(false, retryAfterSeconds);
    }
}
