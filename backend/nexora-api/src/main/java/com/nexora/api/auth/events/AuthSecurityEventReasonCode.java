package com.nexora.api.auth.events;

public enum AuthSecurityEventReasonCode {
    VALIDATION_FAILED("validation_failed"),
    DUPLICATE_ACCOUNT("duplicate_account"),
    INVALID_CREDENTIALS("invalid_credentials"),
    INACTIVE_OR_MISSING_USER("inactive_or_missing_user"),
    INVALID_REFRESH_SESSION("invalid_refresh_session"),
    CSRF_FAILED("csrf_failed"),
    ORIGIN_FAILED("origin_failed"),
    LOGOUT_REQUESTED("logout_requested"),
    LOGOUT_COMPLETED("logout_completed"),
    REGISTER_RATE_LIMITED("register_rate_limited"),
    LOGIN_RATE_LIMITED("login_rate_limited"),
    REFRESH_RATE_LIMITED("refresh_rate_limited"),
    LOGOUT_RATE_LIMITED("logout_rate_limited"),
    AUTH_REJECTION_RATE_LIMITED("auth_rejection_rate_limited"),
    UNKNOWN("unknown");

    private final String code;

    AuthSecurityEventReasonCode(String code) {
        this.code = code;
    }

    public String code() {
        return code;
    }
}
