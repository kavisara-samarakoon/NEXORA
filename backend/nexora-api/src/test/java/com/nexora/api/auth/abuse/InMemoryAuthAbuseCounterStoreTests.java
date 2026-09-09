package com.nexora.api.auth.abuse;

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

    @Test
    void capacityEvictsOldestWindowEvenWhenItWasRecentlyChecked() {
        InMemoryAuthAbuseCounterStore store = new InMemoryAuthAbuseCounterStore(
                Clock.fixed(Instant.EPOCH, ZoneOffset.UTC), 2);

        assertTrue(store.check(AuthAbuseLimit.LOGIN, "first", 1, 60).allowed());
        assertTrue(store.check(AuthAbuseLimit.LOGIN, "second", 1, 60).allowed());
        assertFalse(store.check(AuthAbuseLimit.LOGIN, "first", 1, 60).allowed());
        assertTrue(store.check(AuthAbuseLimit.LOGIN, "third", 1, 60).allowed());

        assertEquals(2, store.activeWindowCount());
        assertFalse(store.check(AuthAbuseLimit.LOGIN, "second", 1, 60).allowed());
        assertFalse(store.check(AuthAbuseLimit.LOGIN, "third", 1, 60).allowed());
        assertTrue(store.check(AuthAbuseLimit.LOGIN, "first", 1, 60).allowed());
        assertEquals(2, store.activeWindowCount());
    }

    @Test
    void expiredWindowsAreRemovedBeforeEvictingLiveWindows() {
        MutableClock clock = new MutableClock(Instant.EPOCH);
        InMemoryAuthAbuseCounterStore store = new InMemoryAuthAbuseCounterStore(clock, 2);
        store.check(AuthAbuseLimit.LOGIN, "expired", 1, 10);
        clock.advance(Duration.ofSeconds(5));
        store.check(AuthAbuseLimit.LOGIN, "live", 1, 10);
        clock.advance(Duration.ofSeconds(5));

        assertTrue(store.check(AuthAbuseLimit.LOGIN, "new", 1, 10).allowed());
        assertEquals(2, store.activeWindowCount());
        AuthAbuseDecision live = store.check(AuthAbuseLimit.LOGIN, "live", 1, 10);
        assertFalse(live.allowed());
        assertEquals(5, live.retryAfterSeconds());
    }

    @Test
    void updatingWindowAtCapacityDoesNotEvictAnotherSubjectOrExtendExpiry() {
        MutableClock clock = new MutableClock(Instant.EPOCH);
        InMemoryAuthAbuseCounterStore store = new InMemoryAuthAbuseCounterStore(clock, 2);
        store.check(AuthAbuseLimit.LOGIN, "first", 2, 10);
        store.check(AuthAbuseLimit.LOGIN, "second", 1, 10);
        clock.advance(Duration.ofSeconds(9));

        assertTrue(store.check(AuthAbuseLimit.LOGIN, "first", 2, 10).allowed());
        assertEquals(1, store.check(AuthAbuseLimit.LOGIN, "first", 2, 10).retryAfterSeconds());
        assertFalse(store.check(AuthAbuseLimit.LOGIN, "second", 1, 10).allowed());
        clock.advance(Duration.ofSeconds(1));
        assertTrue(store.check(AuthAbuseLimit.LOGIN, "first", 2, 10).allowed());
        assertEquals(1, store.activeWindowCount());
    }

    @Test
    void concurrentChecksKeepCapacityAndAttemptCountsAtomic() throws Exception {
        InMemoryAuthAbuseCounterStore store = new InMemoryAuthAbuseCounterStore(
                Clock.fixed(Instant.EPOCH, ZoneOffset.UTC), 3);
        var executor = Executors.newFixedThreadPool(8);
        try {
            var churn = new ArrayList<Future<?>>();
            for (int index = 0; index < 100; index++) {
                String subject = "subject-" + index;
                churn.add(executor.submit(() -> {
                    store.check(AuthAbuseLimit.LOGIN, subject, 5, 60);
                    assertTrue(store.activeWindowCount() <= 3);
                }));
            }
            for (Future<?> request : churn) request.get(5, TimeUnit.SECONDS);
            assertEquals(3, store.activeWindowCount());

            var sameSubject = new ArrayList<Future<Boolean>>();
            for (int index = 0; index < 40; index++) {
                sameSubject.add(executor.submit(() ->
                        store.check(AuthAbuseLimit.LOGIN, "shared", 5, 60).allowed()));
            }
            int allowed = 0;
            for (Future<Boolean> request : sameSubject) {
                if (request.get(5, TimeUnit.SECONDS)) allowed++;
            }
            assertEquals(5, allowed);
            assertEquals(3, store.activeWindowCount());
        } finally {
            executor.shutdownNow();
        }
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
