package com.nexora.api.auth.events;

import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class InMemoryAuthSecurityEventStoreTests {

    @Test
    void retainsOnlyTheNewestEventsWithinItsBound() {
        InMemoryAuthSecurityEventStore store = new InMemoryAuthSecurityEventStore(2);
        LocalDateTime start = LocalDateTime.of(2026, 8, 24, 10, 0);

        store.save(event(AuthSecurityEventType.REGISTER_SUCCESS, start));
        store.save(event(AuthSecurityEventType.LOGIN_SUCCESS, start.plusSeconds(1)));
        store.save(event(AuthSecurityEventType.REFRESH_SUCCESS, start.plusSeconds(2)));

        List<AuthSecurityEvent> retained = store.findAll();
        assertEquals(2, retained.size());
        assertEquals(AuthSecurityEventType.LOGIN_SUCCESS, retained.get(0).getEventType());
        assertEquals(2L, retained.get(0).getId());
        assertEquals(AuthSecurityEventType.REFRESH_SUCCESS, retained.get(1).getEventType());
        assertEquals(3L, retained.get(1).getId());
    }

    @Test
    void defaultRetentionIsBounded() {
        InMemoryAuthSecurityEventStore store = new InMemoryAuthSecurityEventStore();
        LocalDateTime occurredAt = LocalDateTime.of(2026, 8, 24, 10, 0);

        for (int index = 0; index < InMemoryAuthSecurityEventStore.DEFAULT_MAX_EVENTS + 5; index++) {
            store.save(event(AuthSecurityEventType.LOGIN_FAILURE, occurredAt.plusSeconds(index)));
        }

        assertEquals(InMemoryAuthSecurityEventStore.DEFAULT_MAX_EVENTS, store.findAll().size());
        assertEquals(6L, store.findAll().get(0).getId());
    }

    private static AuthSecurityEvent event(AuthSecurityEventType type, LocalDateTime occurredAt) {
        return AuthSecurityEvent.recorded(
                type,
                AuthSecurityEventOutcome.SUCCESS,
                null,
                null,
                occurredAt);
    }
}
