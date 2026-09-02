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
    void sameNormalizedSubjectIsLimitedAndReturnsRetryAfter() {
        InMemoryAuthAbuseCounterStore store = new InMemoryAuthAbuseCounterStore(
                Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));

        assertTrue(store.check(AuthAbuseLimit.LOGIN, " Player@Example.com ", 2, 60).allowed());
        assertTrue(store.check(AuthAbuseLimit.LOGIN, "player@example.com", 2, 60).allowed());
        AuthAbuseDecision rejected = store.check(
                AuthAbuseLimit.LOGIN,
                "PLAYER@EXAMPLE.COM",
                2,
                60);

        assertFalse(rejected.allowed());
        assertEquals(60, rejected.retryAfterSeconds());
    }

    @Test
    void differentSubjectsHaveIndependentBucketsForTheSameOperation() {
        InMemoryAuthAbuseCounterStore store = new InMemoryAuthAbuseCounterStore(
                Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));

        assertTrue(store.check(AuthAbuseLimit.LOGIN, "first@example.com", 1, 60).allowed());
        assertFalse(store.check(AuthAbuseLimit.LOGIN, "first@example.com", 1, 60).allowed());
        assertTrue(store.check(AuthAbuseLimit.LOGIN, "second@example.com", 1, 60).allowed());
        assertEquals(2, store.activeWindowCount());
    }

    @Test
    void resetsAfterWindowAndRemovesOtherExpiredWindows() {
        MutableClock clock = new MutableClock(Instant.parse("2026-08-25T00:00:00Z"));
        InMemoryAuthAbuseCounterStore store = new InMemoryAuthAbuseCounterStore(clock);

        assertTrue(store.check(AuthAbuseLimit.REGISTER, "first@example.com", 1, 10).allowed());
        assertFalse(store.check(AuthAbuseLimit.REGISTER, "first@example.com", 1, 10).allowed());
        assertEquals(1, store.activeWindowCount());

        clock.advance(Duration.ofSeconds(10));
        assertTrue(store.check(AuthAbuseLimit.LOGIN, "first@example.com", 1, 10).allowed());
        assertEquals(1, store.activeWindowCount());
        assertTrue(store.check(AuthAbuseLimit.REGISTER, "first@example.com", 1, 10).allowed());
    }

    @Test
    void operationKeysAreIndependentForTheSameSubject() {
        InMemoryAuthAbuseCounterStore store = new InMemoryAuthAbuseCounterStore(
                Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));

        for (AuthAbuseLimit limit : AuthAbuseLimit.values()) {
            assertTrue(store.check(limit, "same-subject", 1, 60).allowed());
        }

        assertEquals(AuthAbuseLimit.values().length, store.activeWindowCount());
        assertFalse(store.check(AuthAbuseLimit.LOGIN, "same-subject", 1, 60).allowed());
        assertEquals(AuthAbuseLimit.values().length, store.activeWindowCount());
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
