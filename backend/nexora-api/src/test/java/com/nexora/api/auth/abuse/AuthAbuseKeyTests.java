package com.nexora.api.auth.abuse;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

class AuthAbuseKeyTests {

    @Test
    void normalizationProducesTheSameScopedKeyWithoutRetainingTheRawIdentifier() {
        AuthAbuseKey mixedCase = AuthAbuseKey.scoped(
                AuthAbuseLimit.LOGIN,
                " Player@Example.com ");
        AuthAbuseKey normalized = AuthAbuseKey.scoped(
                AuthAbuseLimit.LOGIN,
                "player@example.com");

        assertEquals(normalized, mixedCase);
        assertFalse(mixedCase.subjectDigest().contains("player@example.com"));
        assertFalse(mixedCase.toString().toLowerCase().contains("player@example.com"));
    }

    @Test
    void operationAndCandidateIdentifierBothScopeTheKey() {
        AuthAbuseKey login = AuthAbuseKey.scoped(AuthAbuseLimit.LOGIN, "first@example.com");
        AuthAbuseKey otherLogin = AuthAbuseKey.scoped(AuthAbuseLimit.LOGIN, "second@example.com");
        AuthAbuseKey registration = AuthAbuseKey.scoped(
                AuthAbuseLimit.REGISTER,
                "first@example.com");

        assertNotEquals(login, otherLogin);
        assertNotEquals(login, registration);
    }
}
