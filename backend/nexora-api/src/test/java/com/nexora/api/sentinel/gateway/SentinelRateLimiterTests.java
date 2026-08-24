package com.nexora.api.sentinel.gateway;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SentinelRateLimiterTests {

    @Test
    void requestsBelowLimitPassAndRequestAboveLimitIsRejected() {
        SentinelAiProperties properties = properties(60, 2);
        SentinelRateLimiter limiter = new SentinelRateLimiter(
                properties,
                Clock.fixed(Instant.parse("2026-08-24T00:00:00Z"), ZoneOffset.UTC));

        assertTrue(limiter.check(7L).allowed());
        assertTrue(limiter.check(7L).allowed());
        SentinelRateLimitResult rejected = limiter.check(7L);

        assertFalse(rejected.allowed());
        assertEquals(60, rejected.retryAfterSeconds());
    }

    @Test
    void disabledRateLimitAllowsRequests() {
        SentinelAiProperties properties = properties(60, 1);
        properties.getSafety().setRateLimitEnabled(false);
        SentinelRateLimiter limiter = new SentinelRateLimiter(
                properties,
                Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));

        for (int request = 0; request < 25; request++) {
            assertTrue(limiter.check(7L).allowed());
        }
    }

    @Test
    void windowResetsAfterConfiguredTime() {
        SentinelAiProperties properties = properties(10, 1);
        MutableClock clock = new MutableClock(Instant.parse("2026-08-24T00:00:00Z"));
        SentinelRateLimiter limiter = new SentinelRateLimiter(properties, clock);

        assertTrue(limiter.check(7L).allowed());
        assertFalse(limiter.check(7L).allowed());
        clock.advance(Duration.ofSeconds(10));
        assertTrue(limiter.check(7L).allowed());
    }

    @Test
    void limitsUsersIndependently() {
        SentinelRateLimiter limiter = new SentinelRateLimiter(
                properties(60, 1),
                Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));

        assertTrue(limiter.check(7L).allowed());
        assertFalse(limiter.check(7L).allowed());
        assertTrue(limiter.check(8L).allowed());
    }

    private static SentinelAiProperties properties(int windowSeconds, int maxRequests) {
        SentinelAiProperties properties = new SentinelAiProperties();
        properties.getSafety().setRateLimitWindowSeconds(windowSeconds);
        properties.getSafety().setRateLimitMaxRequests(maxRequests);
        return properties;
    }

    private static final class MutableClock extends Clock {

        private Instant instant;

        private MutableClock(Instant instant) {
            this.instant = instant;
        }

        private void advance(Duration duration) {
            instant = instant.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }
}
