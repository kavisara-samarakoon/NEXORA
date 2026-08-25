package com.nexora.api.auth.events;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class AuthSecurityEventRetentionPropertiesTests {

    @Test
    void defaultsDisableCleanupAndUseThirtyDays() {
        AuthSecurityEventRetentionProperties properties =
                new AuthSecurityEventRetentionProperties();

        assertFalse(properties.isCleanupEnabled());
        assertEquals(30, properties.boundedRetentionDays());
    }

    @Test
    void retentionDaysAreClampedToSafeBounds() {
        AuthSecurityEventRetentionProperties properties =
                new AuthSecurityEventRetentionProperties();

        properties.setRetentionDays(0);
        assertEquals(1, properties.boundedRetentionDays());

        properties.setRetentionDays(10_000);
        assertEquals(3_650, properties.boundedRetentionDays());
    }
}
