package com.nexora.api.auth.session;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class RefreshSessionPropertiesTests {
    private static final String HASH_SECRET =
            "unit-test-refresh-token-hash-secret-at-least-thirty-two-bytes";

    @Test
    void sameSiteNoneRequiresSecureRefreshCookies() {
        assertThrows(IllegalArgumentException.class, () -> properties(false, "None"));

        assertEquals("None", properties(true, "None").cookieSameSite());
    }

    @Test
    void sameSiteValuesNormalizeToSupportedCookieAttributes() {
        assertEquals("Lax", properties(false, " lax ").cookieSameSite());
        assertEquals("Strict", properties(false, "STRICT").cookieSameSite());
        assertEquals("None", properties(true, "none").cookieSameSite());
    }

    private static RefreshSessionProperties properties(boolean secure, String sameSite) {
        return new RefreshSessionProperties(
                HASH_SECRET,
                "nexora_refresh_token",
                7,
                secure,
                sameSite,
                "/api/auth");
    }
}
