package com.nexora.api.sentinel.gateway;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SentinelProviderHealthServiceTests {

    private static final Clock FIXED_CLOCK = Clock.fixed(
            Instant.parse("2026-08-24T05:30:00Z"),
            ZoneOffset.UTC);

    @Test
    void recordsGeminiSuccessAndResetsConsecutiveFailures() {
        SentinelProviderHealthService service = new SentinelProviderHealthService(FIXED_CLOCK);
        service.recordGeminiFallback(SentinelProviderFallbackReason.GEMINI_INVALID_RESPONSE);
        service.recordGeminiSuccess();

        SentinelProviderHealthSnapshot snapshot = service.snapshot();

        assertEquals(FIXED_CLOCK.instant(), snapshot.lastGeminiSuccessAt());
        assertEquals(0, snapshot.consecutiveGeminiFailures());
        assertEquals(1, snapshot.totalGeminiSuccessCount());
        assertEquals(1, snapshot.totalLocalFallbackCount());
    }

    @Test
    void recordsOnlySafeFallbackHealthMetadata() {
        SentinelProviderHealthService service = new SentinelProviderHealthService(FIXED_CLOCK);

        service.recordGeminiFallback(
                SentinelProviderFallbackReason.GEMINI_TIMEOUT_OR_NETWORK);
        SentinelProviderHealthSnapshot snapshot = service.snapshot();

        assertEquals(FIXED_CLOCK.instant(), snapshot.lastGeminiFallbackAt());
        assertEquals(
                SentinelProviderFallbackReason.GEMINI_TIMEOUT_OR_NETWORK,
                snapshot.lastFallbackReason());
        assertEquals(1, snapshot.consecutiveGeminiFailures());
        assertEquals(1, snapshot.totalLocalFallbackCount());
        assertTrue(Arrays.stream(snapshot.getClass().getRecordComponents())
                .noneMatch(component -> component.getType().equals(String.class)));
    }

    @Test
    void newServiceStartsWithEmptyInMemoryState() {
        SentinelProviderHealthService first = new SentinelProviderHealthService(FIXED_CLOCK);
        first.recordGeminiSuccess();

        SentinelProviderHealthSnapshot reset =
                new SentinelProviderHealthService(FIXED_CLOCK).snapshot();

        assertNull(reset.lastGeminiSuccessAt());
        assertNull(reset.lastGeminiFallbackAt());
        assertNull(reset.lastFallbackReason());
        assertEquals(0, reset.consecutiveGeminiFailures());
        assertEquals(0, reset.totalLocalFallbackCount());
        assertEquals(0, reset.totalGeminiSuccessCount());
    }
}
