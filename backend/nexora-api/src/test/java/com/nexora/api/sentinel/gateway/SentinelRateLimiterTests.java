package com.nexora.api.sentinel.gateway;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

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
        assertEquals(0, limiter.activeWindowCount());
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

    @Test
    void capacityEvictsOldestWindowEvenWhenItWasRecentlyChecked() {
        SentinelRateLimiter limiter = new SentinelRateLimiter(
                properties(60, 1), Clock.fixed(Instant.EPOCH, ZoneOffset.UTC), 2);

        assertTrue(limiter.check(1L).allowed());
        assertTrue(limiter.check(2L).allowed());
        assertFalse(limiter.check(1L).allowed());
        assertTrue(limiter.check(3L).allowed());

        assertEquals(2, limiter.activeWindowCount());
        assertFalse(limiter.check(2L).allowed());
        assertFalse(limiter.check(3L).allowed());
        assertTrue(limiter.check(1L).allowed());
        assertEquals(2, limiter.activeWindowCount());
    }

    @Test
    void expiredWindowsAreRemovedBeforeEvictingLiveWindows() {
        MutableClock clock = new MutableClock(Instant.EPOCH);
        SentinelRateLimiter limiter = new SentinelRateLimiter(properties(10, 1), clock, 2);
        limiter.check(1L);
        clock.advance(Duration.ofSeconds(5));
        limiter.check(2L);
        clock.advance(Duration.ofSeconds(5));

        assertTrue(limiter.check(3L).allowed());
        assertEquals(2, limiter.activeWindowCount());
        SentinelRateLimitResult live = limiter.check(2L);
        assertFalse(live.allowed());
        assertEquals(5, live.retryAfterSeconds());
    }

    @Test
    void ordinaryCheckCleansOtherExpiredWindowsBelowCapacity() {
        MutableClock clock = new MutableClock(Instant.EPOCH);
        SentinelRateLimiter limiter = new SentinelRateLimiter(properties(10, 1), clock);
        limiter.check(1L);
        limiter.check(2L);
        clock.advance(Duration.ofSeconds(10));

        assertTrue(limiter.check(3L).allowed());
        assertEquals(1, limiter.activeWindowCount());
    }

    @Test
    void updatingWindowAtCapacityDoesNotEvictAnotherUserOrExtendExpiry() {
        MutableClock clock = new MutableClock(Instant.EPOCH);
        SentinelRateLimiter limiter = new SentinelRateLimiter(properties(10, 2), clock, 2);
        limiter.check(1L);
        limiter.check(2L);
        limiter.check(2L);
        clock.advance(Duration.ofSeconds(9));

        assertTrue(limiter.check(1L).allowed());
        assertEquals(1, limiter.check(1L).retryAfterSeconds());
        assertFalse(limiter.check(2L).allowed());
        clock.advance(Duration.ofSeconds(1));
        assertTrue(limiter.check(1L).allowed());
        assertEquals(1, limiter.activeWindowCount());
    }

    @Test
    void concurrentChecksKeepCapacityAndRequestCountsAtomic() throws Exception {
        SentinelRateLimiter limiter = new SentinelRateLimiter(
                properties(60, 5), Clock.fixed(Instant.EPOCH, ZoneOffset.UTC), 3);
        var executor = Executors.newFixedThreadPool(8);
        try {
            var churn = new ArrayList<Future<?>>();
            for (long userId = 0; userId < 100; userId++) {
                long subject = userId;
                churn.add(executor.submit(() -> {
                    limiter.check(subject);
                    assertTrue(limiter.activeWindowCount() <= 3);
                }));
            }
            for (Future<?> request : churn) request.get(5, TimeUnit.SECONDS);
            assertEquals(3, limiter.activeWindowCount());

            var sameUser = new ArrayList<Future<Boolean>>();
            for (int index = 0; index < 40; index++) {
                sameUser.add(executor.submit(() -> limiter.check(100L).allowed()));
            }
            int allowed = 0;
            for (Future<Boolean> request : sameUser) {
                if (request.get(5, TimeUnit.SECONDS)) allowed++;
            }
            assertEquals(5, allowed);
            assertEquals(3, limiter.activeWindowCount());
        } finally {
            executor.shutdownNow();
        }
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
