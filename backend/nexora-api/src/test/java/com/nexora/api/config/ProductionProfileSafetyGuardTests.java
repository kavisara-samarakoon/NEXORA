package com.nexora.api.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProductionProfileSafetyGuardTests {

    private static final String STRONG_VALUE_ONE =
            "A9b7C6d5E4f3G2h1J8k7L6m5N4p3Q2r1S8t7U6v5W4x3Y2z1";
    private static final String STRONG_VALUE_TWO =
            "Z1y2X3w4V5u6T7s8R9q1P2n3M4k5J6h7G8f9E1d2C3b4A5z6";

    @Test
    void defaultProfileDoesNotEnforceProductionPolicy() {
        assertDoesNotThrow(() -> ProductionProfileSafetyGuard.validate(new MockEnvironment()));
    }

    @Test
    void devProfileDoesNotEnforceProductionPolicy() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("dev");

        assertDoesNotThrow(() -> ProductionProfileSafetyGuard.validate(environment));
    }

    @Test
    void productionProfileWithoutDevFailsPersistenceCheckBeforeAuthPolicy() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("production");

        IllegalStateException exception = assertUnsafe(environment);

        assertTrue(exception.getMessage().contains(
                "Production-like profiles require persistent storage"));
        assertTrue(exception.getMessage().contains(
                "must not run with in-memory demo persistence"));
    }

    @Test
    void productionProfileRejectsLocalJwtDefault() {
        MockEnvironment environment = safeProductionEnvironment();
        environment.setProperty(
                "nexora.auth.jwt-secret",
                "nexora-local-development-only-secret-change-before-deployment");

        IllegalStateException exception = assertUnsafe(environment);

        assertTrue(exception.getMessage().contains("nexora.auth.jwt-secret"));
        assertFalse(exception.getMessage().contains(
                "nexora-local-development-only-secret-change-before-deployment"));
    }

    @Test
    void prodProfileRejectsLocalRefreshHashDefault() {
        MockEnvironment environment = safeProductionEnvironment("prod");
        environment.setProperty(
                "nexora.auth.refresh-token-hash-secret",
                "nexora-local-refresh-token-hash-secret-change-before-deployment");

        IllegalStateException exception = assertUnsafe(environment);

        assertTrue(exception.getMessage().contains("nexora.auth.refresh-token-hash-secret"));
        assertFalse(exception.getMessage().contains(
                "nexora-local-refresh-token-hash-secret-change-before-deployment"));
    }

    @Test
    void productionProfileRejectsShortAndObviousPlaceholderSecrets() {
        MockEnvironment environment = safeProductionEnvironment();
        environment.setProperty("nexora.auth.jwt-secret", "short-production-value");
        environment.setProperty(
                "nexora.auth.refresh-token-hash-secret",
                "replace-me-with-a-production-refresh-value-that-is-long-enough");

        IllegalStateException exception = assertUnsafe(environment);

        assertTrue(exception.getMessage().contains("at least 48 bytes"));
        assertTrue(exception.getMessage().contains("obvious local, test, or placeholder value"));
    }

    @Test
    void productionProfileRejectsMissingSecretsAndOrigins() {
        MockEnvironment environment = safeProductionEnvironment();
        environment.setProperty("nexora.auth.jwt-secret", " ");
        environment.setProperty("nexora.auth.refresh-token-hash-secret", "");
        environment.setProperty("nexora.auth.trusted-origins", " ");

        IllegalStateException exception = assertUnsafe(environment);

        assertTrue(exception.getMessage().contains(
                "nexora.auth.jwt-secret must be configured"));
        assertTrue(exception.getMessage().contains(
                "nexora.auth.refresh-token-hash-secret must be configured"));
        assertTrue(exception.getMessage().contains(
                "nexora.auth.trusted-origins must be configured"));
    }

    @Test
    void productionProfileRequiresIndependentAuthSecrets() {
        MockEnvironment environment = safeProductionEnvironment();
        environment.setProperty("nexora.auth.refresh-token-hash-secret", STRONG_VALUE_ONE);

        IllegalStateException exception = assertUnsafe(environment);

        assertTrue(exception.getMessage().contains(
                "nexora.auth.jwt-secret and nexora.auth.refresh-token-hash-secret"
                        + " must use different values"));
        assertFalse(exception.getMessage().contains(STRONG_VALUE_ONE));
    }

    @Test
    void productionProfileRequiresSecureRefreshCookie() {
        MockEnvironment environment = safeProductionEnvironment();
        environment.setProperty("nexora.auth.refresh-token-cookie-secure", "false");

        IllegalStateException exception = assertUnsafe(environment);

        assertTrue(exception.getMessage().contains(
                "nexora.auth.refresh-token-cookie-secure must be true"));
    }

    @Test
    void productionProfileRequiresSafeRefreshCookiePath() {
        MockEnvironment environment = safeProductionEnvironment();
        environment.setProperty("nexora.auth.refresh-token-cookie-path", "/");

        IllegalStateException exception = assertUnsafe(environment);

        assertTrue(exception.getMessage().contains(
                "nexora.auth.refresh-token-cookie-path must remain /api/auth"));
    }

    @Test
    void productionProfileRequiresCsrfProtection() {
        MockEnvironment environment = safeProductionEnvironment();
        environment.setProperty("nexora.auth.csrf.enabled", "false");

        IllegalStateException exception = assertUnsafe(environment);

        assertTrue(exception.getMessage().contains("nexora.auth.csrf.enabled must be true"));
    }

    @Test
    void productionProfileRequiresSecureCsrfCookie() {
        MockEnvironment environment = safeProductionEnvironment();
        environment.setProperty("nexora.auth.csrf.cookie-secure", "false");

        IllegalStateException exception = assertUnsafe(environment);

        assertTrue(exception.getMessage().contains(
                "nexora.auth.csrf.cookie-secure must be true"));
    }

    @Test
    void productionProfileRejectsLocalTrustedOrigin() {
        MockEnvironment environment = safeProductionEnvironment();
        environment.setProperty("nexora.auth.trusted-origins", "https://localhost:3000");

        IllegalStateException exception = assertUnsafe(environment);

        assertTrue(exception.getMessage().contains(
                "nexora.auth.trusted-origins must not contain local addresses"));
    }

    @Test
    void productionProfileRejectsLoopbackAnyAddressAndDevelopmentPorts() {
        MockEnvironment environment = safeProductionEnvironment();
        environment.setProperty(
                "nexora.auth.trusted-origins",
                "https://127.0.0.1,https://0.0.0.0,https://app.nexora.com:5173");

        IllegalStateException exception = assertUnsafe(environment);

        assertTrue(exception.getMessage().contains("must not contain local addresses"));
        assertTrue(exception.getMessage().contains("must not use common local development ports"));
    }

    @Test
    void productionProfileRejectsInsecureAndWildcardTrustedOrigins() {
        MockEnvironment environment = safeProductionEnvironment();
        environment.setProperty(
                "nexora.auth.trusted-origins",
                "http://app.nexora.com,https://*.nexora.com");

        IllegalStateException exception = assertUnsafe(environment);

        assertTrue(exception.getMessage().contains("must use https:// origins"));
        assertTrue(exception.getMessage().contains("must not contain wildcard origins"));
    }

    @Test
    void productionProfileAcceptsSafeProductionLikeConfiguration() {
        assertDoesNotThrow(() -> ProductionProfileSafetyGuard.validate(
                safeProductionEnvironment()));
    }

    @Test
    void failureCollectsProblemsWithoutExposingConfiguredSecrets() {
        String configuredJwt = "R4w8M2n6P9q3S7t1V5x8Z2b6D9f3H7j1L5p8T2w6Y9c3F7k1";
        String configuredRefresh = "K7m3Q9r5U1v8X4z2B6d9F3h7J1n5P8s2W6y9A3c7E1g5L8q4";
        MockEnvironment environment = safeProductionEnvironment();
        environment.setProperty("nexora.auth.jwt-secret", configuredJwt);
        environment.setProperty("nexora.auth.refresh-token-hash-secret", configuredRefresh);
        environment.setProperty("nexora.auth.refresh-token-cookie-secure", "false");
        environment.setProperty("nexora.auth.csrf.enabled", "false");

        IllegalStateException exception = assertUnsafe(environment);

        assertTrue(exception.getMessage().contains("nexora.auth.refresh-token-cookie-secure"));
        assertTrue(exception.getMessage().contains("nexora.auth.csrf.enabled"));
        assertFalse(exception.getMessage().contains(configuredJwt));
        assertFalse(exception.getMessage().contains(configuredRefresh));
    }

    private static MockEnvironment safeProductionEnvironment() {
        return safeProductionEnvironment("production");
    }

    private static MockEnvironment safeProductionEnvironment(String profile) {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles(profile, "dev");
        environment.setProperty("nexora.auth.jwt-secret", STRONG_VALUE_ONE);
        environment.setProperty("nexora.auth.refresh-token-hash-secret", STRONG_VALUE_TWO);
        environment.setProperty("nexora.auth.refresh-token-cookie-secure", "true");
        environment.setProperty("nexora.auth.refresh-token-cookie-path", "/api/auth");
        environment.setProperty("nexora.auth.csrf.enabled", "true");
        environment.setProperty("nexora.auth.csrf.cookie-secure", "true");
        environment.setProperty("nexora.auth.trusted-origins", "https://app.nexora.com");
        return environment;
    }

    private static IllegalStateException assertUnsafe(MockEnvironment environment) {
        return assertThrows(
                IllegalStateException.class,
                () -> ProductionProfileSafetyGuard.validate(environment));
    }
}
