package com.nexora.api.config;

import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.beans.factory.config.ConfigurableListableBeanFactory;
import org.springframework.context.EnvironmentAware;
import org.springframework.core.Ordered;
import org.springframework.core.PriorityOrdered;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

@Component
public final class ProductionProfileSafetyGuard
        implements BeanFactoryPostProcessor, EnvironmentAware, PriorityOrdered {

    private static final String JWT_SECRET_PROPERTY = "nexora.auth.jwt-secret";
    private static final String REFRESH_HASH_SECRET_PROPERTY =
            "nexora.auth.refresh-token-hash-secret";
    private static final String REFRESH_COOKIE_SECURE_PROPERTY =
            "nexora.auth.refresh-token-cookie-secure";
    private static final String REFRESH_COOKIE_PATH_PROPERTY =
            "nexora.auth.refresh-token-cookie-path";
    private static final String CSRF_ENABLED_PROPERTY = "nexora.auth.csrf.enabled";
    private static final String CSRF_COOKIE_SECURE_PROPERTY =
            "nexora.auth.csrf.cookie-secure";
    private static final String TRUSTED_ORIGINS_PROPERTY = "nexora.auth.trusted-origins";

    private static final String LOCAL_JWT_SECRET =
            "nexora-local-development-only-secret-change-before-deployment";
    private static final String LOCAL_REFRESH_HASH_SECRET =
            "nexora-local-refresh-token-hash-secret-change-before-deployment";
    private static final int MINIMUM_PRODUCTION_SECRET_BYTES = 48;
    private static final String AUTH_COOKIE_PATH = "/api/auth";
    private static final Set<Integer> LOCAL_DEVELOPMENT_PORTS = Set.of(3000, 5173, 8080);
    private static final Pattern PLACEHOLDER_WORD = Pattern.compile(
            "(^|[^a-z0-9])(dev|development|dummy|example|local|password|placeholder|"
                    + "qwerty|sample|test|testing|temporary)([^a-z0-9]|$)");
    private static final Set<String> COMPACT_PLACEHOLDER_MARKERS = Set.of(
            "change-before",
            "changeme",
            "change_me",
            "change-me",
            "replace_me",
            "replace-me",
            "123456");

    private Environment environment;

    @Override
    public void setEnvironment(Environment environment) {
        this.environment = environment;
    }

    @Override
    public int getOrder() {
        return Ordered.HIGHEST_PRECEDENCE;
    }

    @Override
    public void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory)
            throws BeansException {
        validate(environment);
    }

    static void validate(Environment environment) {
        ProductionProfilePersistenceGuard.validate(environment);

        if (environment == null
                || !environment.acceptsProfiles(Profiles.of("prod", "production"))) {
            return;
        }

        LinkedHashSet<String> failures = new LinkedHashSet<>();
        String jwtSecret = environment.getProperty(JWT_SECRET_PROPERTY);
        String refreshHashSecret = environment.getProperty(REFRESH_HASH_SECRET_PROPERTY);
        validateSecret(
                jwtSecret,
                JWT_SECRET_PROPERTY,
                LOCAL_JWT_SECRET,
                failures);
        validateSecret(
                refreshHashSecret,
                REFRESH_HASH_SECRET_PROPERTY,
                LOCAL_REFRESH_HASH_SECRET,
                failures);
        if (jwtSecret != null
                && !jwtSecret.isBlank()
                && jwtSecret.equals(refreshHashSecret)) {
            failures.add(JWT_SECRET_PROPERTY + " and " + REFRESH_HASH_SECRET_PROPERTY
                    + " must use different values in production");
        }

        requireTrue(environment, REFRESH_COOKIE_SECURE_PROPERTY, failures);
        validateRefreshCookiePath(environment.getProperty(REFRESH_COOKIE_PATH_PROPERTY), failures);
        requireTrue(environment, CSRF_ENABLED_PROPERTY, failures);
        requireTrue(environment, CSRF_COOKIE_SECURE_PROPERTY, failures);
        validateTrustedOrigins(environment.getProperty(TRUSTED_ORIGINS_PROPERTY), failures);

        if (!failures.isEmpty()) {
            throw new IllegalStateException(
                    "Production profile safety checks failed:\n - "
                            + String.join("\n - ", failures));
        }
    }

    private static void validateSecret(
            String value,
            String property,
            String localDefault,
            Set<String> failures) {
        if (value == null || value.isBlank()) {
            failures.add(property + " must be configured for production");
            return;
        }
        if (localDefault.equals(value)) {
            failures.add(property + " must not use the local development default");
            return;
        }
        if (value.getBytes(StandardCharsets.UTF_8).length < MINIMUM_PRODUCTION_SECRET_BYTES) {
            failures.add(property + " must contain at least 48 bytes in production");
            return;
        }
        if (looksLikePlaceholder(value)) {
            failures.add(property + " must not use an obvious local, test, or placeholder value");
        }
    }

    private static boolean looksLikePlaceholder(String value) {
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        return PLACEHOLDER_WORD.matcher(normalized).find()
                || COMPACT_PLACEHOLDER_MARKERS.stream().anyMatch(normalized::contains);
    }

    private static void requireTrue(
            Environment environment,
            String property,
            Set<String> failures) {
        String value = environment.getProperty(property);
        if (value == null || !"true".equalsIgnoreCase(value.trim())) {
            failures.add(property + " must be true in production");
        }
    }

    private static void validateRefreshCookiePath(String value, Set<String> failures) {
        if (value == null || !AUTH_COOKIE_PATH.equals(value.trim())) {
            failures.add(REFRESH_COOKIE_PATH_PROPERTY + " must remain /api/auth in production");
        }
    }

    private static void validateTrustedOrigins(String configuredOrigins, Set<String> failures) {
        if (configuredOrigins == null || configuredOrigins.isBlank()) {
            failures.add(TRUSTED_ORIGINS_PROPERTY + " must be configured for production");
            return;
        }

        List<String> origins = Arrays.stream(configuredOrigins.split(",", -1))
                .map(String::trim)
                .toList();
        if (origins.stream().anyMatch(String::isEmpty)) {
            failures.add(TRUSTED_ORIGINS_PROPERTY + " must contain only complete origins");
        }

        for (String origin : origins) {
            if (!origin.isEmpty()) {
                validateTrustedOrigin(origin, failures);
            }
        }
    }

    private static void validateTrustedOrigin(String origin, Set<String> failures) {
        if (origin.contains("*")) {
            failures.add(TRUSTED_ORIGINS_PROPERTY + " must not contain wildcard origins");
            return;
        }

        URI uri;
        try {
            uri = URI.create(origin);
        } catch (IllegalArgumentException exception) {
            failures.add(TRUSTED_ORIGINS_PROPERTY + " must contain valid HTTPS origins");
            return;
        }

        if (!"https".equalsIgnoreCase(uri.getScheme())) {
            failures.add(TRUSTED_ORIGINS_PROPERTY + " must use https:// origins in production");
        }

        String host = uri.getHost();
        if (host == null
                || uri.getUserInfo() != null
                || uri.getQuery() != null
                || uri.getFragment() != null
                || !hasOriginOnlyPath(uri)) {
            failures.add(TRUSTED_ORIGINS_PROPERTY + " must contain exact origins without paths");
            return;
        }

        String normalizedHost = host.toLowerCase(Locale.ROOT);
        if (isLocalHost(normalizedHost)) {
            failures.add(TRUSTED_ORIGINS_PROPERTY + " must not contain local addresses");
        }
        if (LOCAL_DEVELOPMENT_PORTS.contains(uri.getPort())) {
            failures.add(TRUSTED_ORIGINS_PROPERTY
                    + " must not use common local development ports");
        }
    }

    private static boolean hasOriginOnlyPath(URI uri) {
        return uri.getPath() == null || uri.getPath().isEmpty() || "/".equals(uri.getPath());
    }

    private static boolean isLocalHost(String host) {
        return "localhost".equals(host)
                || host.endsWith(".localhost")
                || "127.0.0.1".equals(host)
                || "0.0.0.0".equals(host)
                || "::1".equals(host)
                || "[::1]".equals(host);
    }
}
