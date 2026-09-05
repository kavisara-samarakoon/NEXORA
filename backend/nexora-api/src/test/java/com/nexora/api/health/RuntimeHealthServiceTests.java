package com.nexora.api.health;

import com.nexora.api.notifications.NotificationProperties;
import com.nexora.api.sentinel.gateway.SentinelAiProperties;
import com.nexora.api.wishlist.WishlistPriceRefreshProperties;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RuntimeHealthServiceTests {

    private static final Instant NOW = Instant.parse("2026-08-26T12:00:00Z");

    @Test
    void defaultProfileReportsSafeLocalDemoSummary() {
        HealthResponse health = service(new MockEnvironment()).getHealth();

        assertEquals("UP", health.status());
        assertEquals("NEXORA API", health.service());
        assertEquals(
                RuntimeHealthService.OBSERVABILITY_CONTRACT_MILESTONE,
                health.milestone());
        assertEquals(
                RuntimeHealthService.OBSERVABILITY_CONTRACT_MILESTONE,
                health.observabilityContractMilestone());
        assertEquals(health.milestone(), health.observabilityContractMilestone());
        assertEquals("local-demo", health.runtimeMode());
        assertEquals(List.of("default"), health.activeProfiles());
        assertEquals("in-memory-demo", health.dataMode());
        assertEquals("local", health.sentinelProvider());
        assertEquals("log", health.notificationProvider());
        assertEquals("stored", health.priceRefreshProvider());
        assertEquals(NOW, health.startedAtUtc());
        assertEquals(NOW, health.checkedAtUtc());
        assertEquals(0, health.uptimeSeconds());
        assertEquals("inactive", health.checks().get("authProductionGuard"));
        assertEquals("not-required", health.checks().get("database"));
    }

    @Test
    void devProfileReportsPostgresModeWithoutConfigurationDetails() {
        String databaseLocation = "jdbc:postgresql://private-db.internal:5432/nexora";
        String databaseIdentity = "runtime_private_user";
        String databaseCredential = "runtime-private-database-credential";
        MockEnvironment environment = new MockEnvironment()
                .withProperty("spring.datasource.url", databaseLocation)
                .withProperty("spring.datasource.username", databaseIdentity)
                .withProperty("spring.datasource.password", databaseCredential);
        environment.setActiveProfiles("dev");

        HealthResponse health = service(environment).getHealth();
        String rendered = health.toString();

        assertEquals("dev-postgres", health.runtimeMode());
        assertEquals(List.of("dev"), health.activeProfiles());
        assertEquals("postgres-dev", health.dataMode());
        assertEquals("configured-by-dev-profile", health.checks().get("database"));
        assertFalse(rendered.contains(databaseLocation));
        assertFalse(rendered.contains(databaseIdentity));
        assertFalse(rendered.contains(databaseCredential));
    }

    @Test
    void productionAndDevProfilesReportGuardActiveWithPersistentDataMode() {
        MockEnvironment environment = new MockEnvironment()
                .withProperty(
                        "nexora.auth.jwt-secret",
                        "A9b7C6d5E4f3G2h1J8k7L6m5N4p3Q2r1S8t7U6v5W4x3Y2z1")
                .withProperty(
                        "nexora.auth.refresh-token-hash-secret",
                        "Z1y2X3w4V5u6T7s8R9q1P2n3M4k5J6h7G8f9E1d2C3b4A5z6")
                .withProperty("nexora.auth.refresh-token-cookie-secure", "true")
                .withProperty("nexora.auth.refresh-token-cookie-path", "/api/auth")
                .withProperty("nexora.auth.csrf.enabled", "true")
                .withProperty("nexora.auth.csrf.cookie-secure", "true")
                .withProperty("nexora.auth.trusted-origins", "https://app.nexora.example");
        environment.setActiveProfiles("production", "dev");

        HealthResponse health = service(environment).getHealth();

        assertEquals("production", health.runtimeMode());
        assertEquals(List.of("production", "dev"), health.activeProfiles());
        assertEquals("postgres-dev", health.dataMode());
        assertEquals("active", health.checks().get("authProductionGuard"));
        assertEquals("configured-by-dev-profile", health.checks().get("database"));
    }

    @Test
    void unknownProviderAndProfileValuesAreNeverEchoed() {
        String profileValue = "customer-sensitive-profile-value";
        String notificationValue = "customer-sensitive-notification-value";
        String refreshValue = "customer-sensitive-refresh-value";
        SentinelAiProperties sentinel = new SentinelAiProperties();
        sentinel.setProvider("customer-sensitive-sentinel-value");
        NotificationProperties notifications = new NotificationProperties();
        notifications.setProvider(notificationValue);
        WishlistPriceRefreshProperties priceRefresh = new WishlistPriceRefreshProperties();
        priceRefresh.setProvider(refreshValue);
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles(profileValue);

        HealthResponse health = service(
                environment,
                sentinel,
                notifications,
                priceRefresh).getHealth();
        String rendered = health.toString();

        assertEquals(List.of("custom"), health.activeProfiles());
        assertEquals("local", health.sentinelProvider());
        assertEquals("unsupported", health.notificationProvider());
        assertEquals("unsupported", health.priceRefreshProvider());
        assertFalse(rendered.contains(profileValue));
        assertFalse(rendered.contains(notificationValue));
        assertFalse(rendered.contains(refreshValue));
    }

    @Test
    void configuredOptionalProvidersReportOnlyAllowlistedNames() {
        SentinelAiProperties sentinel = new SentinelAiProperties();
        sentinel.setProvider("gemini");
        sentinel.getGemini().setApiKey("configured-provider-test-value");
        NotificationProperties notifications = new NotificationProperties();
        notifications.setProvider("email");
        notifications.setEnabled(true);
        WishlistPriceRefreshProperties priceRefresh = new WishlistPriceRefreshProperties();
        priceRefresh.setProvider("cheapshark");

        HealthResponse health = service(
                new MockEnvironment(),
                sentinel,
                notifications,
                priceRefresh).getHealth();

        assertEquals("gemini", health.sentinelProvider());
        assertEquals("email", health.notificationProvider());
        assertEquals("cheapshark", health.priceRefreshProvider());
        assertEquals("gemini-provider-configured", health.checks().get("sentinel"));
        assertEquals("email-provider-enabled", health.checks().get("notifications"));
    }

    @Test
    void startupSummaryContainsOnlySafeDerivedValues() {
        String sensitiveValue = "do-not-log-runtime-sensitive-value";
        MockEnvironment environment = new MockEnvironment()
                .withProperty("nexora.auth.jwt-secret", sensitiveValue)
                .withProperty("spring.datasource.password", sensitiveValue)
                .withProperty("nexora.sentinel.ai.gemini.api-key", sensitiveValue);

        String summary = RuntimeStartupLogger.startupSummary(service(environment).getHealth());

        assertFalse(summary.contains(sensitiveValue));
        assertFalse(summary.contains("jwt-secret"));
        assertFalse(summary.contains("datasource"));
        assertFalse(summary.contains("api-key"));
        assertTrue(summary.contains("runtimeMode=local-demo"));
    }

    private static RuntimeHealthService service(MockEnvironment environment) {
        return service(
                environment,
                new SentinelAiProperties(),
                new NotificationProperties(),
                new WishlistPriceRefreshProperties());
    }

    private static RuntimeHealthService service(
            MockEnvironment environment,
            SentinelAiProperties sentinel,
            NotificationProperties notifications,
            WishlistPriceRefreshProperties priceRefresh) {
        return new RuntimeHealthService(
                environment,
                sentinel,
                notifications,
                priceRefresh,
                Clock.fixed(NOW, ZoneOffset.UTC));
    }
}
