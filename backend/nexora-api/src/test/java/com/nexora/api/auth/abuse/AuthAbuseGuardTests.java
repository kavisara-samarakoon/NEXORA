package com.nexora.api.auth.abuse;

import com.nexora.api.auth.events.AuthSecurityEvent;
import com.nexora.api.auth.events.AuthSecurityEventOutcome;
import com.nexora.api.auth.events.AuthSecurityEventService;
import com.nexora.api.auth.events.AuthSecurityEventStore;
import com.nexora.api.auth.events.AuthSecurityEventType;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AuthAbuseGuardTests {

    @Test
    void disabledModeAlwaysAllowsAndDoesNotCreateWindows() {
        AuthAbuseControlProperties properties = new AuthAbuseControlProperties();
        properties.setEnabled(false);
        InMemoryAuthAbuseCounterStore store = new InMemoryAuthAbuseCounterStore(
                Clock.fixed(Instant.EPOCH, ZoneOffset.UTC));
        AuthAbuseGuard guard = new AuthAbuseGuard(
                properties,
                store,
                new AuthSecurityEventService(new CollectingEventStore()));

        for (int attempt = 0; attempt < 25; attempt++) {
            assertDoesNotThrow(() -> guard.check(AuthAbuseLimit.LOGIN));
        }
        assertEquals(0, store.activeWindowCount());
    }

    @Test
    void rejectedAttemptRecordsOnlyTypedSafeRateLimitMetadata() {
        AuthAbuseControlProperties properties = new AuthAbuseControlProperties();
        properties.setLoginMaxAttempts(1);
        CollectingEventStore events = new CollectingEventStore();
        AuthAbuseGuard guard = new AuthAbuseGuard(
                properties,
                new InMemoryAuthAbuseCounterStore(Clock.fixed(Instant.EPOCH, ZoneOffset.UTC)),
                new AuthSecurityEventService(events));

        guard.check(AuthAbuseLimit.LOGIN);
        AuthRateLimitExceededException exception = assertThrows(
                AuthRateLimitExceededException.class,
                () -> guard.check(AuthAbuseLimit.LOGIN));

        assertEquals(60, exception.retryAfterSeconds());
        AuthSecurityEvent event = events.findAll().get(0);
        assertEquals(AuthSecurityEventType.AUTH_RATE_LIMITED, event.getEventType());
        assertEquals(AuthSecurityEventOutcome.REJECTED, event.getOutcome());
        assertEquals("login_rate_limited", event.getReasonCode());
        assertNull(event.getUserId());
    }

    private static final class CollectingEventStore implements AuthSecurityEventStore {

        private final List<AuthSecurityEvent> events = new ArrayList<>();

        @Override
        public AuthSecurityEvent save(AuthSecurityEvent event) {
            events.add(event);
            return event;
        }

        @Override
        public List<AuthSecurityEvent> findAll() {
            return List.copyOf(events);
        }

        @Override
        public int deleteOlderThan(LocalDateTime cutoff) {
            int sizeBefore = events.size();
            events.removeIf(event -> event.getOccurredAt().isBefore(cutoff));
            return sizeBefore - events.size();
        }
    }
}
