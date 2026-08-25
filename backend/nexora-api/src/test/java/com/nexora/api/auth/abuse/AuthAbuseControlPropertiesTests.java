package com.nexora.api.auth.abuse;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AuthAbuseControlPropertiesTests {

    @Test
    void defaultsAreEnabledAndWithinSafeBounds() {
        AuthAbuseControlProperties properties = new AuthAbuseControlProperties();

        assertTrue(properties.isEnabled());
        assertEquals(60, properties.boundedWindowSeconds());
        assertEquals(10, properties.boundedMaxAttempts(AuthAbuseLimit.REGISTER));
        assertEquals(20, properties.boundedMaxAttempts(AuthAbuseLimit.LOGIN));
        assertEquals(30, properties.boundedMaxAttempts(AuthAbuseLimit.REFRESH));
        assertEquals(30, properties.boundedMaxAttempts(AuthAbuseLimit.LOGOUT));
        assertEquals(30, properties.boundedMaxAttempts(AuthAbuseLimit.CSRF_ORIGIN_REJECTION));
    }

    @Test
    void invalidConfiguredValuesAreClampedToSafeBounds() {
        AuthAbuseControlProperties properties = new AuthAbuseControlProperties();
        properties.setWindowSeconds(0);
        properties.setRegisterMaxAttempts(0);
        properties.setLoginMaxAttempts(-5);
        properties.setRefreshMaxAttempts(20_000);
        properties.setLogoutMaxAttempts(Integer.MAX_VALUE);
        properties.setRejectionMaxAttempts(-1);

        assertEquals(1, properties.boundedWindowSeconds());
        assertEquals(1, properties.boundedMaxAttempts(AuthAbuseLimit.REGISTER));
        assertEquals(1, properties.boundedMaxAttempts(AuthAbuseLimit.LOGIN));
        assertEquals(10_000, properties.boundedMaxAttempts(AuthAbuseLimit.REFRESH));
        assertEquals(10_000, properties.boundedMaxAttempts(AuthAbuseLimit.LOGOUT));
        assertEquals(1, properties.boundedMaxAttempts(AuthAbuseLimit.CSRF_ORIGIN_REJECTION));

        properties.setWindowSeconds(7_200);
        assertEquals(3_600, properties.boundedWindowSeconds());
    }
}
