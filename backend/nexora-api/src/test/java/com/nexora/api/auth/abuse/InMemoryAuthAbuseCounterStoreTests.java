package com.nexora.api.auth.abuse;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class InMemoryAuthAbuseCounterStoreTests {

    @Test
    void allowsAttemptsThroughLimitThenReturnsRetryAfter() {
        InMemoryAuthAbuseCounterStore store = new InMemoryAuthAbuseCounterStore(
                Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));

        assertTrue(store.check(AuthAbuseLimit.LOGIN, 2, 60).allowed());
        assertTrue(store.check(AuthAbuseLimit.LOGIN, 2, 60).allowed());
        AuthAbuseDecision rejected = store.check(AuthAbuseLimit.LOGIN, 2, 60);

        assertFalse(rejected.allowed());
        assertEquals(60, rejected.retryAfterSeconds());
    }

    @Test
    void resetsAfterWindowAndRemovesOtherExpiredWindows() {
        MutableClock clock = new MutableClock(Instant.parse("2026-08-25T00:00:00Z"));
        InMemoryAuthAbuseCounterStore store = new InMemoryAuthAbuseCounterStore(clock);

        assertTrue(store.check(AuthAbuseLimit.REGISTER, 1, 10).allowed());
        assertFalse(store.check(AuthAbuseLimit.REGISTER, 1, 10).allowed());
        assertEquals(1, store.activeWindowCount());

        clock.advance(Duration.ofSeconds(10));
        assertTrue(store.check(AuthAbuseLimit.LOGIN, 1, 10).allowed());
        assertEquals(1, store.activeWindowCount());
        assertTrue(store.check(AuthAbuseLimit.REGISTER, 1, 10).allowed());
    }

    @Test
    void purposeKeysAreIndependentAndBoundTheStoreSize() {
        InMemoryAuthAbuseCounterStore store = new InMemoryAuthAbuseCounterStore(
                Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));

        for (AuthAbuseLimit limit : AuthAbuseLimit.values()) {
            assertTrue(store.check(limit, 1, 60).allowed());
        }

        assertEquals(AuthAbuseLimit.values().length, store.activeWindowCount());
        assertFalse(store.check(AuthAbuseLimit.LOGIN, 1, 60).allowed());
        assertTrue(store.activeWindowCount() <= AuthAbuseLimit.values().length);
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
