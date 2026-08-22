package com.nexora.api.auth.csrf;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;

@Service
public class AuthBrowserRequestGuard {

    private final AuthCsrfProperties properties;
    private final AuthCsrfService csrfService;

    public AuthBrowserRequestGuard(AuthCsrfProperties properties, AuthCsrfService csrfService) {
        this.properties = properties;
        this.csrfService = csrfService;
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
            throw new AuthRequestProtectionException();
        }
    }

    private void requireTrustedOrigin(String headerValue, boolean requireOriginOnlyValue) {
        String requestOrigin = AuthCsrfProperties.requestOrigin(headerValue);
        if (requestOrigin == null
                || (requireOriginOnlyValue && !requestOrigin.equalsIgnoreCase(headerValue.trim()))
                || !properties.trustedOrigins().contains(requestOrigin)) {
            throw new AuthRequestProtectionException();
        }
    }
}
