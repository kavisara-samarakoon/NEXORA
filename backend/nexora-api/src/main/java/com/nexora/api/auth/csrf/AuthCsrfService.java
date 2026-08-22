package com.nexora.api.auth.csrf;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

@Service
public class AuthCsrfService {

    private static final int TOKEN_BYTES = 32;

    private final AuthCsrfProperties properties;
    private final SecureRandom secureRandom = new SecureRandom();

    public AuthCsrfService(AuthCsrfProperties properties) {
        this.properties = properties;
    }

    public String generateToken() {
        byte[] bytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public String issueCookie(String token) {
        return ResponseCookie.from(properties.cookieName(), token)
                .httpOnly(false)
                .secure(properties.cookieSecure())
                .sameSite(properties.cookieSameSite())
                .path(properties.cookiePath())
                .maxAge(properties.expiration())
                .build()
                .toString();
    }

    public boolean requestTokenMatches(HttpServletRequest request) {
        String headerToken = request.getHeader(properties.headerName());
        String cookieToken = readCookieToken(request);
        if (!isValidToken(headerToken) || !isValidToken(cookieToken)) {
            return false;
        }
        return MessageDigest.isEqual(
                headerToken.getBytes(StandardCharsets.US_ASCII),
                cookieToken.getBytes(StandardCharsets.US_ASCII));
    }

    private String readCookieToken(HttpServletRequest request) {
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

    private static boolean isValidToken(String token) {
        return token != null && token.matches("[A-Za-z0-9_-]{43}");
    }
}
