package com.nexora.api.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ProductionProfilePersistenceGuardTests {

    @Test
    void defaultLocalProfileStillStarts() {
        assertDoesNotThrow(() -> ProductionProfilePersistenceGuard.validate(
                new MockEnvironment()));
    }

    @Test
    void devProfileStillStarts() {
        MockEnvironment environment = environmentWithProfiles("dev");

        assertDoesNotThrow(() -> ProductionProfilePersistenceGuard.validate(environment));
    }

    @Test
    void prodProfileWithoutPersistentProfileFailsClosed() {
        IllegalStateException exception = assertFailsClosed("prod");

        assertSafePersistenceMessage(exception.getMessage());
    }

    @Test
    void productionProfileWithoutPersistentProfileFailsClosed() {
        IllegalStateException exception = assertFailsClosed("production");

        assertSafePersistenceMessage(exception.getMessage());
    }

    @Test
    void hostedDemoProfileWithoutPersistentProfileFailsClosed() {
        IllegalStateException exception = assertFailsClosed("hosted-demo");

        assertSafePersistenceMessage(exception.getMessage());
    }

    @Test
    void prodAndDevProfilesAreAllowed() {
        MockEnvironment environment = environmentWithProfiles("prod", "dev");

        assertDoesNotThrow(() -> ProductionProfilePersistenceGuard.validate(environment));
    }

    @Test
    void productionAndDevProfilesAreAllowed() {
        MockEnvironment environment = environmentWithProfiles("production", "dev");

        assertDoesNotThrow(() -> ProductionProfilePersistenceGuard.validate(environment));
    }

    @Test
    void hostedDemoAndDevProfilesAreAllowed() {
        MockEnvironment environment = environmentWithProfiles("hosted-demo", "dev");

        assertDoesNotThrow(() -> ProductionProfilePersistenceGuard.validate(environment));
    }

    @Test
    void failureMessageDoesNotEchoConfigurationValues() {
        String privateMarkerOne = "private-marker-one";
        String privateMarkerTwo = "private-marker-two";
        MockEnvironment environment = environmentWithProfiles("prod")
                .withProperty("sensitive.marker.one", privateMarkerOne)
                .withProperty("sensitive.marker.two", privateMarkerTwo);

        String message = assertThrows(
                IllegalStateException.class,
                () -> ProductionProfilePersistenceGuard.validate(environment)).getMessage();

        assertSafePersistenceMessage(message);
        assertFalse(message.contains(privateMarkerOne));
        assertFalse(message.contains(privateMarkerTwo));
        assertFalse(message.contains("://"));
        assertFalse(message.contains("="));
    }

    private static IllegalStateException assertFailsClosed(String profile) {
        MockEnvironment environment = environmentWithProfiles(profile);
        return assertThrows(
                IllegalStateException.class,
                () -> ProductionProfilePersistenceGuard.validate(environment));
    }

    private static MockEnvironment environmentWithProfiles(String... profiles) {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles(profiles);
        return environment;
    }

    private static void assertSafePersistenceMessage(String message) {
        assertTrue(message.contains("Production-like profiles require persistent storage"));
        assertTrue(message.contains("must not run with in-memory demo persistence"));
    }
}
