package com.nexora.api.auth.session;

import com.nexora.api.auth.AuthenticationFailedException;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.assertThrows;

class RefreshSessionServiceTests {

    @Test
    void expiredRefreshTokenCannotRotate() {
        RefreshSessionProperties properties = properties();
        RefreshTokenCodec codec = new RefreshTokenCodec(properties);
        InMemoryRefreshSessionStore store = new InMemoryRefreshSessionStore();
        Clock issuedClock = Clock.fixed(Instant.parse("2026-08-22T10:00:00Z"), ZoneOffset.UTC);
        RefreshSessionService issuingService =
                new RefreshSessionService(store, codec, properties, issuedClock);
        String token = issuingService.issue(1L).token();

        RefreshSessionService expiredService = new RefreshSessionService(
                store,
                codec,
                properties,
                Clock.offset(issuedClock, Duration.ofDays(8)));

        assertThrows(AuthenticationFailedException.class, () -> expiredService.rotate(token));
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
