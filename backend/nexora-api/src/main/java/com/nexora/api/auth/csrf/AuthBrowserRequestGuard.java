package com.nexora.api.auth.csrf;

import com.nexora.api.auth.abuse.AuthAbuseGuard;
import com.nexora.api.auth.abuse.AuthAbuseLimit;
import com.nexora.api.auth.events.AuthSecurityEventReasonCode;
import com.nexora.api.auth.events.AuthSecurityEventService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;

@Service
public class AuthBrowserRequestGuard {

    private final AuthCsrfProperties properties;
    private final AuthCsrfService csrfService;
    private final AuthSecurityEventService securityEventService;
    private final AuthAbuseGuard abuseGuard;

    public AuthBrowserRequestGuard(
            AuthCsrfProperties properties,
            AuthCsrfService csrfService,
            AuthSecurityEventService securityEventService,
            AuthAbuseGuard abuseGuard) {
        this.properties = properties;
        this.csrfService = csrfService;
        this.securityEventService = securityEventService;
        this.abuseGuard = abuseGuard;
    }

    public void validate(HttpServletRequest request) {
        if (!properties.enabled()) {
            return;
        }

        validateOrigin(request);
        validateCsrf(request);
    }

    public void validateOrigin(HttpServletRequest request) {
        if (!properties.enabled()) {
            return;
        }

        String origin = request.getHeader(HttpHeaders.ORIGIN);
        String referer = request.getHeader(HttpHeaders.REFERER);
        if (origin != null) {
            requireTrustedOrigin(origin, true);
        } else if (referer != null) {
            requireTrustedOrigin(referer, false);
        }
    }

    private void validateCsrf(HttpServletRequest request) {
        if (!csrfService.requestTokenMatches(request)) {
            reject(AuthSecurityEventReasonCode.CSRF_FAILED);
        }
    }

    private void requireTrustedOrigin(String headerValue, boolean requireOriginOnlyValue) {
        String requestOrigin = AuthCsrfProperties.requestOrigin(headerValue);
        if (requestOrigin == null
                || (requireOriginOnlyValue && !requestOrigin.equalsIgnoreCase(headerValue.trim()))
                || !properties.trustedOrigins().contains(requestOrigin)) {
            reject(AuthSecurityEventReasonCode.ORIGIN_FAILED);
        }
    }

    private void reject(AuthSecurityEventReasonCode reasonCode) {
        abuseGuard.check(AuthAbuseLimit.CSRF_ORIGIN_REJECTION);
        securityEventService.recordCsrfOriginFailure(reasonCode);
        throw new AuthRequestProtectionException();
    }
}
