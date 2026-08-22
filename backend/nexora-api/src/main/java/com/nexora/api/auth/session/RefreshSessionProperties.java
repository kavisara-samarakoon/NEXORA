package com.nexora.api.auth.session;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Locale;
import java.util.Set;

@Component
public class RefreshSessionProperties {

    private static final int MINIMUM_HASH_SECRET_BYTES = 32;
    private static final Set<String> SAME_SITE_VALUES = Set.of("Lax", "Strict", "None");

    private final String hashSecret;
    private final String cookieName;
    private final Duration expiration;
    private final boolean cookieSecure;
    private final String cookieSameSite;
    private final String cookiePath;

    public RefreshSessionProperties(
            @Value("${nexora.auth.refresh-token-hash-secret}") String hashSecret,
            @Value("${nexora.auth.refresh-token-cookie-name:nexora_refresh_token}") String cookieName,
            @Value("${nexora.auth.refresh-token-expiration-days:7}") long expirationDays,
            @Value("${nexora.auth.refresh-token-cookie-secure:false}") boolean cookieSecure,
            @Value("${nexora.auth.refresh-token-cookie-same-site:Lax}") String cookieSameSite,
            @Value("${nexora.auth.refresh-token-cookie-path:/api/auth}") String cookiePath) {
        if (hashSecret == null
                || hashSecret.getBytes(StandardCharsets.UTF_8).length < MINIMUM_HASH_SECRET_BYTES) {
            throw new IllegalArgumentException(
                    "nexora.auth.refresh-token-hash-secret must contain at least 32 bytes");
        }
        if (cookieName == null || !cookieName.matches("[!#$%&'*+\\-.^_`|~0-9A-Za-z]+")) {
            throw new IllegalArgumentException("nexora.auth.refresh-token-cookie-name is invalid");
        }
        if (expirationDays <= 0) {
            throw new IllegalArgumentException(
                    "nexora.auth.refresh-token-expiration-days must be positive");
        }
        if (cookiePath == null || !cookiePath.startsWith("/") || cookiePath.contains(";")) {
            throw new IllegalArgumentException("nexora.auth.refresh-token-cookie-path is invalid");
        }

        String normalizedSameSite = normalizeSameSite(cookieSameSite);
        if ("None".equals(normalizedSameSite) && !cookieSecure) {
            throw new IllegalArgumentException(
                    "SameSite=None refresh cookies must enable the Secure attribute");
        }

        this.hashSecret = hashSecret;
        this.cookieName = cookieName;
        this.expiration = Duration.ofDays(expirationDays);
        this.cookieSecure = cookieSecure;
        this.cookieSameSite = normalizedSameSite;
        this.cookiePath = cookiePath;
    }

    public String hashSecret() {
        return hashSecret;
    }

    public String cookieName() {
        return cookieName;
    }

    public Duration expiration() {
        return expiration;
    }

    public boolean cookieSecure() {
        return cookieSecure;
    }

    public String cookieSameSite() {
        return cookieSameSite;
    }

    public String cookiePath() {
        return cookiePath;
    }

    private static String normalizeSameSite(String value) {
        if (value == null) {
            throw new IllegalArgumentException("nexora.auth.refresh-token-cookie-same-site is invalid");
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        String candidate = normalized.isEmpty()
                ? ""
                : Character.toUpperCase(normalized.charAt(0)) + normalized.substring(1);
        if (!SAME_SITE_VALUES.contains(candidate)) {
            throw new IllegalArgumentException(
                    "nexora.auth.refresh-token-cookie-same-site must be Lax, Strict, or None");
        }
        return candidate;
    }
}
