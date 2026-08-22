package com.nexora.api.auth.csrf;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.time.Duration;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;

@Component
public class AuthCsrfProperties {

    private static final Set<String> SAME_SITE_VALUES = Set.of("Lax", "Strict", "None");

    private final boolean enabled;
    private final String cookieName;
    private final String headerName;
    private final boolean cookieSecure;
    private final String cookieSameSite;
    private final String cookiePath;
    private final Duration expiration;
    private final Set<String> trustedOrigins;

    public AuthCsrfProperties(
            @Value("${nexora.auth.csrf.enabled:true}") boolean enabled,
            @Value("${nexora.auth.csrf.cookie-name:nexora_csrf_token}") String cookieName,
            @Value("${nexora.auth.csrf.header-name:X-NEXORA-CSRF}") String headerName,
            @Value("${nexora.auth.csrf.cookie-secure:false}") boolean cookieSecure,
            @Value("${nexora.auth.csrf.cookie-same-site:Lax}") String cookieSameSite,
            @Value("${nexora.auth.csrf.cookie-path:/api/auth}") String cookiePath,
            @Value("${nexora.auth.csrf.expiration-minutes:120}") long expirationMinutes,
            @Value("${nexora.auth.trusted-origins:http://localhost:3000,http://localhost:5173}")
            String trustedOrigins) {
        if (!isToken(cookieName)) {
            throw new IllegalArgumentException("nexora.auth.csrf.cookie-name is invalid");
        }
        if (!isToken(headerName)) {
            throw new IllegalArgumentException("nexora.auth.csrf.header-name is invalid");
        }
        if (cookiePath == null || !cookiePath.startsWith("/") || cookiePath.contains(";")) {
            throw new IllegalArgumentException("nexora.auth.csrf.cookie-path is invalid");
        }
        if (expirationMinutes <= 0) {
            throw new IllegalArgumentException("nexora.auth.csrf.expiration-minutes must be positive");
        }

        String normalizedSameSite = normalizeSameSite(cookieSameSite);
        if ("None".equals(normalizedSameSite) && !cookieSecure) {
            throw new IllegalArgumentException("SameSite=None CSRF cookies must enable Secure");
        }

        Set<String> normalizedOrigins = new LinkedHashSet<>();
        if (trustedOrigins != null) {
            Arrays.stream(trustedOrigins.split(","))
                    .map(String::trim)
                    .filter(value -> !value.isEmpty())
                    .map(AuthCsrfProperties::normalizeConfiguredOrigin)
                    .forEach(normalizedOrigins::add);
        }
        if (normalizedOrigins.isEmpty()) {
            throw new IllegalArgumentException("nexora.auth.trusted-origins must not be empty");
        }

        this.enabled = enabled;
        this.cookieName = cookieName;
        this.headerName = headerName;
        this.cookieSecure = cookieSecure;
        this.cookieSameSite = normalizedSameSite;
        this.cookiePath = cookiePath;
        this.expiration = Duration.ofMinutes(expirationMinutes);
        this.trustedOrigins = Set.copyOf(normalizedOrigins);
    }

    public boolean enabled() {
        return enabled;
    }

    public String cookieName() {
        return cookieName;
    }

    public String headerName() {
        return headerName;
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

    public Duration expiration() {
        return expiration;
    }

    public Set<String> trustedOrigins() {
        return trustedOrigins;
    }

    public static String requestOrigin(String value) {
        if (value == null || value.isBlank() || "null".equalsIgnoreCase(value.trim())) {
            return null;
        }
        try {
            URI uri = URI.create(value.trim());
            if (uri.getScheme() == null || uri.getHost() == null || uri.getUserInfo() != null) {
                return null;
            }
            String scheme = uri.getScheme().toLowerCase(Locale.ROOT);
            if (!"http".equals(scheme) && !"https".equals(scheme)) {
                return null;
            }
            StringBuilder origin = new StringBuilder(scheme)
                    .append("://")
                    .append(uri.getHost().toLowerCase(Locale.ROOT));
            if (uri.getPort() >= 0) {
                origin.append(':').append(uri.getPort());
            }
            return origin.toString();
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    private static String normalizeConfiguredOrigin(String value) {
        String origin = requestOrigin(value);
        if (origin == null || !origin.equalsIgnoreCase(stripTrailingSlash(value))) {
            throw new IllegalArgumentException("nexora.auth.trusted-origins contains an invalid origin");
        }
        return origin;
    }

    private static String stripTrailingSlash(String value) {
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private static boolean isToken(String value) {
        return value != null && value.matches("[!#$%&'*+\\-.^_`|~0-9A-Za-z]+");
    }

    private static String normalizeSameSite(String value) {
        if (value == null) {
            throw new IllegalArgumentException("nexora.auth.csrf.cookie-same-site is invalid");
        }
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        String candidate = normalized.isEmpty()
                ? ""
                : Character.toUpperCase(normalized.charAt(0)) + normalized.substring(1);
        if (!SAME_SITE_VALUES.contains(candidate)) {
            throw new IllegalArgumentException(
                    "nexora.auth.csrf.cookie-same-site must be Lax, Strict, or None");
        }
        return candidate;
    }
}
