package com.nexora.api.auth.session;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

@Service
public class RefreshCookieService {

    private final RefreshSessionProperties properties;

    public RefreshCookieService(RefreshSessionProperties properties) {
        this.properties = properties;
    }

    public String readToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (Cookie cookie : cookies) {
            if (properties.cookieName().equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    public String issueCookie(String rawToken) {
        return cookie(rawToken)
                .maxAge(properties.expiration())
                .build()
                .toString();
    }

    public String clearCookie() {
        return cookie("")
                .maxAge(0)
                .build()
                .toString();
    }

    private ResponseCookie.ResponseCookieBuilder cookie(String value) {
        return ResponseCookie.from(properties.cookieName(), value)
                .httpOnly(true)
                .secure(properties.cookieSecure())
                .sameSite(properties.cookieSameSite())
                .path(properties.cookiePath());
    }
}
