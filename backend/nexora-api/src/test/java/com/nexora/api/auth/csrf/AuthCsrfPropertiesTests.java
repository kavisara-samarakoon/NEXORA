package com.nexora.api.auth.csrf;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AuthCsrfPropertiesTests {

    @Test
    void sameSiteNoneRequiresSecureCsrfCookies() {
        assertThrows(IllegalArgumentException.class, () -> properties(false, "None"));

        assertEquals("None", properties(true, "None").cookieSameSite());
    }

    @Test
    void sameSiteValuesNormalizeToSupportedCookieAttributes() {
        assertEquals("Lax", properties(false, " lax ").cookieSameSite());
        assertEquals("Strict", properties(false, "STRICT").cookieSameSite());
        assertEquals("None", properties(true, "none").cookieSameSite());
    }

    private static AuthCsrfProperties properties(boolean secure, String sameSite) {
        return new AuthCsrfProperties(
                true,
                "nexora_csrf_token",
                "X-NEXORA-CSRF",
                secure,
                sameSite,
                "/api/auth",
                120,
                "http://localhost:3000");
    }
}
