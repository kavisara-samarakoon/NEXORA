package com.nexora.api.auth.csrf;

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

    public AuthBrowserRequestGuard(
            AuthCsrfProperties properties,
            AuthCsrfService csrfService,
            AuthSecurityEventService securityEventService) {
        this.properties = properties;
        this.csrfService = csrfService;
        this.securityEventService = securityEventService;
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
            securityEventService.recordCsrfOriginFailure(AuthSecurityEventReasonCode.CSRF_FAILED);
            throw new AuthRequestProtectionException();
        }
    }

    private void requireTrustedOrigin(String headerValue, boolean requireOriginOnlyValue) {
        String requestOrigin = AuthCsrfProperties.requestOrigin(headerValue);
        if (requestOrigin == null
                || (requireOriginOnlyValue && !requestOrigin.equalsIgnoreCase(headerValue.trim()))
                || !properties.trustedOrigins().contains(requestOrigin)) {
            securityEventService.recordCsrfOriginFailure(AuthSecurityEventReasonCode.ORIGIN_FAILED);
            throw new AuthRequestProtectionException();
        }
    }
}
