package com.nexora.api.config;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.ConfigDataApplicationContextInitializer;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.core.env.PropertiesPropertySource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.support.PropertiesLoaderUtils;
import org.springframework.mock.env.MockEnvironment;

import java.io.IOException;
import java.util.Arrays;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class HostedDemoEnvironmentTests {

    private final ApplicationContextRunner hostedDemoContextRunner =
            new ApplicationContextRunner()
                    .withInitializer(new ConfigDataApplicationContextInitializer())
                    .withPropertyValues("spring.profiles.active=hosted-demo")
                    .withUserConfiguration(HostedDemoGuardConfiguration.class);

    @Test
    void hostedDemoProfileLoadsAsFailClosedProductionLikeConfiguration() {
        hostedDemoContextRunner
                .withPropertyValues(
                        "PORT=18080",
                        "NEXORA_DB_URL=jdbc:postgresql://db.nexora.internal:5432/nexora",
                        "NEXORA_DB_USERNAME=nexora_app",
                        "NEXORA_DB_PASSWORD=" + "G8m2".repeat(6),
                        "NEXORA_JWT_SECRET=" + "A9b7".repeat(12),
                        "NEXORA_REFRESH_TOKEN_HASH_SECRET=" + "Z1y2".repeat(12),
                        "NEXORA_AUTH_TRUSTED_ORIGINS=https://app.nexora.invalid")
                .run(context -> {
                    assertNull(context.getStartupFailure());
                    assertTrue(Arrays.asList(context.getEnvironment().getActiveProfiles())
                            .containsAll(Arrays.asList("hosted-demo", "dev", "production")));
                    assertEquals("18080", context.getEnvironment().getProperty("server.port"));
                    assertEquals(
                            "jdbc:postgresql://db.nexora.internal:5432/nexora",
                            context.getEnvironment().getProperty("spring.datasource.url"));
                });
    }

    @Test
    void hostedDemoProfileWithoutExternalSettingsFailsContextStartup() {
        hostedDemoContextRunner.run(context -> assertNotNull(context.getStartupFailure()));
    }

    @Test
    void hostedDemoProfileComposesPersistenceAndProductionSafetyProfiles()
            throws IOException {
        Properties applicationProperties = load("application.properties");

        assertEquals(
                "dev,production",
                applicationProperties.getProperty("spring.profiles.group.hosted-demo"));
    }

    @Test
    void hostedDemoProfileRequiresExternalRuntimeDatabaseAndAuthValues()
            throws IOException {
        Properties hostedProperties = load("application-hosted-demo.properties");

        assertEquals("${PORT}", hostedProperties.getProperty("server.port"));
        assertEquals("${NEXORA_DB_URL}", hostedProperties.getProperty("spring.datasource.url"));
        assertEquals(
                "${NEXORA_DB_USERNAME}",
                hostedProperties.getProperty("spring.datasource.username"));
        assertEquals(
                "${NEXORA_DB_PASSWORD}",
                hostedProperties.getProperty("spring.datasource.password"));
        assertEquals(
                "${NEXORA_JWT_SECRET}",
                hostedProperties.getProperty("nexora.auth.jwt-secret"));
        assertEquals(
                "${NEXORA_REFRESH_TOKEN_HASH_SECRET}",
                hostedProperties.getProperty("nexora.auth.refresh-token-hash-secret"));
        assertEquals(
                "${NEXORA_AUTH_TRUSTED_ORIGINS}",
                hostedProperties.getProperty("nexora.auth.trusted-origins"));
    }

    @Test
    void hostedDemoProfileUsesSecureLaxCookieBaseline() throws IOException {
        Properties hostedProperties = load("application-hosted-demo.properties");

        assertEquals(
                "true",
                hostedProperties.getProperty("nexora.auth.refresh-token-cookie-secure"));
        assertEquals(
                "${NEXORA_REFRESH_TOKEN_COOKIE_SAME_SITE:Lax}",
                hostedProperties.getProperty("nexora.auth.refresh-token-cookie-same-site"));
        assertEquals(
                "/api/auth",
                hostedProperties.getProperty("nexora.auth.refresh-token-cookie-path"));
        assertEquals("true", hostedProperties.getProperty("nexora.auth.csrf.enabled"));
        assertEquals(
                "true",
                hostedProperties.getProperty("nexora.auth.csrf.cookie-secure"));
        assertEquals(
                "${NEXORA_AUTH_CSRF_COOKIE_SAME_SITE:Lax}",
                hostedProperties.getProperty("nexora.auth.csrf.cookie-same-site"));
        assertEquals(
                "/api/auth",
                hostedProperties.getProperty("nexora.auth.csrf.cookie-path"));
    }

    @Test
    void resolvedHostedOriginsRemainExactAndNeverWildcard() throws IOException {
        Properties hostedProperties = load("application-hosted-demo.properties");
        MockEnvironment environment = new MockEnvironment()
                .withProperty("NEXORA_AUTH_TRUSTED_ORIGINS", "https://app.nexora.invalid");
        environment.getPropertySources().addLast(
                new PropertiesPropertySource("hosted-demo", hostedProperties));

        String trustedOrigins = environment.getRequiredProperty("nexora.auth.trusted-origins");

        assertEquals("https://app.nexora.invalid", trustedOrigins);
        assertFalse(trustedOrigins.contains("*"));
        assertTrue(trustedOrigins.startsWith("https://"));
    }

    private static Properties load(String resourceName) throws IOException {
        return PropertiesLoaderUtils.loadProperties(new ClassPathResource(resourceName));
    }

    @Configuration(proxyBeanMethods = false)
    @Import(ProductionProfileSafetyGuard.class)
    static class HostedDemoGuardConfiguration {
    }
}
