package com.nexora.api.auth.abuse;

import com.nexora.api.auth.events.AuthSecurityEventReasonCode;

public enum AuthAbuseLimit {
    REGISTER(AuthSecurityEventReasonCode.REGISTER_RATE_LIMITED),
    LOGIN(AuthSecurityEventReasonCode.LOGIN_RATE_LIMITED),
    REFRESH(AuthSecurityEventReasonCode.REFRESH_RATE_LIMITED),
    LOGOUT(AuthSecurityEventReasonCode.LOGOUT_RATE_LIMITED),
    CSRF_ORIGIN_REJECTION(AuthSecurityEventReasonCode.AUTH_REJECTION_RATE_LIMITED);

    private final AuthSecurityEventReasonCode reasonCode;

    AuthAbuseLimit(AuthSecurityEventReasonCode reasonCode) {
        this.reasonCode = reasonCode;
    }

    AuthSecurityEventReasonCode reasonCode() {
        return reasonCode;
    }
}
