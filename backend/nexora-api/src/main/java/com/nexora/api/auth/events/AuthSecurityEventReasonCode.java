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
    UNKNOWN("unknown");

    private final String code;

    AuthSecurityEventReasonCode(String code) {
        this.code = code;
    }

    public String code() {
        return code;
    }
}
