package com.nexora.api.auth.session;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RefreshTokenCodecTests {

    private final RefreshTokenCodec codec = new RefreshTokenCodec(properties());

    @Test
    void hashIsDeterministicAndDoesNotExposeRawToken() {
        String token = codec.generateToken();

        String firstHash = codec.hash(token);
        String secondHash = codec.hash(token);

        assertEquals(firstHash, secondHash);
        assertNotEquals(token, firstHash);
        assertEquals(64, firstHash.length());
        assertTrue(firstHash.matches("[0-9a-f]+"));
    }

    @Test
    void generatedTokensAreNonBlankUniqueAndCookieSafe() {
        String firstToken = codec.generateToken();
        String secondToken = codec.generateToken();

        assertFalse(firstToken.isBlank());
        assertNotEquals(firstToken, secondToken);
        assertTrue(firstToken.matches("[A-Za-z0-9_-]+"));
        assertTrue(codec.isWellFormed(firstToken));
    }

    private static RefreshSessionProperties properties() {
        return new RefreshSessionProperties(
                "unit-test-refresh-token-hash-secret-at-least-thirty-two-bytes",
                "nexora_refresh_token",
                7,
                false,
                "Lax",
                "/api/auth");
    }
}
