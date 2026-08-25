package com.nexora.api.auth.events;

import org.junit.jupiter.api.Test;

import java.lang.reflect.Modifier;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class AuthSecurityEventServiceTests {

    private static final Instant EVENT_TIME = Instant.parse("2026-08-24T10:00:00Z");

    @Test
    void recordsOnlyTypedSafeMetadataForSupportedAuthEvents() {
        InMemoryAuthSecurityEventStore store = new InMemoryAuthSecurityEventStore();
        AuthSecurityEventService service = new AuthSecurityEventService(
                store,
                Clock.fixed(EVENT_TIME, ZoneOffset.UTC));

        service.recordRegisterSuccess(11L);
        service.recordRegisterFailure(AuthSecurityEventReasonCode.DUPLICATE_ACCOUNT);
        service.recordLoginSuccess(12L);
        service.recordLoginFailure(AuthSecurityEventReasonCode.INVALID_CREDENTIALS);
        service.recordRefreshSuccess(13L);
        service.recordRefreshFailure(AuthSecurityEventReasonCode.INVALID_REFRESH_SESSION);
        service.recordLogoutRequested();
        service.recordLogoutCompleted(null);
        service.recordCsrfOriginFailure(AuthSecurityEventReasonCode.ORIGIN_FAILED);
        service.recordAuthRateLimited(AuthSecurityEventReasonCode.LOGIN_RATE_LIMITED);

        List<AuthSecurityEvent> events = store.findAll();
        assertEquals(10, events.size());
        assertEvent(events.get(0), AuthSecurityEventType.REGISTER_SUCCESS,
                AuthSecurityEventOutcome.SUCCESS, 11L, null);
        assertEvent(events.get(1), AuthSecurityEventType.REGISTER_FAILURE,
                AuthSecurityEventOutcome.FAILURE, null, "duplicate_account");
        assertEvent(events.get(2), AuthSecurityEventType.LOGIN_SUCCESS,
                AuthSecurityEventOutcome.SUCCESS, 12L, null);
        assertEvent(events.get(3), AuthSecurityEventType.LOGIN_FAILURE,
                AuthSecurityEventOutcome.FAILURE, null, "invalid_credentials");
        assertEvent(events.get(4), AuthSecurityEventType.REFRESH_SUCCESS,
                AuthSecurityEventOutcome.SUCCESS, 13L, null);
        assertEvent(events.get(5), AuthSecurityEventType.REFRESH_FAILURE,
                AuthSecurityEventOutcome.FAILURE, null, "invalid_refresh_session");
        assertEvent(events.get(6), AuthSecurityEventType.LOGOUT_REQUESTED,
                AuthSecurityEventOutcome.SUCCESS, null, "logout_requested");
        assertEvent(events.get(7), AuthSecurityEventType.LOGOUT_COMPLETED,
                AuthSecurityEventOutcome.SUCCESS, null, "logout_completed");
        assertEvent(events.get(8), AuthSecurityEventType.CSRF_ORIGIN_FAILURE,
                AuthSecurityEventOutcome.REJECTED, null, "origin_failed");
        assertEvent(events.get(9), AuthSecurityEventType.AUTH_RATE_LIMITED,
                AuthSecurityEventOutcome.REJECTED, null, "login_rate_limited");
    }

    @Test
    void eventModelHasNoCredentialIdentifierTokenCookieOrRequestContextFields() {
        Set<String> persistedFieldNames = Set.of(
                "id",
                "eventType",
                "outcome",
                "userId",
                "reasonCode",
                "source",
                "occurredAt",
                "createdAt");

        Set<String> actualFieldNames = java.util.Arrays.stream(AuthSecurityEvent.class.getDeclaredFields())
                .filter(field -> !Modifier.isStatic(field.getModifiers()))
                .map(java.lang.reflect.Field::getName)
                .collect(java.util.stream.Collectors.toUnmodifiableSet());

        assertEquals(persistedFieldNames, actualFieldNames);
    }

    @Test
    void storeFailureNeverEscapesToTheAuthCaller() {
        AuthSecurityEventStore failingStore = new AuthSecurityEventStore() {
            @Override
            public AuthSecurityEvent save(AuthSecurityEvent event) {
                throw new IllegalStateException("simulated event store failure");
            }

            @Override
            public List<AuthSecurityEvent> findAll() {
                return List.of();
            }

            @Override
            public int deleteOlderThan(LocalDateTime cutoff) {
                throw new IllegalStateException("simulated event store failure");
            }
        };
        AuthSecurityEventService service = new AuthSecurityEventService(
                failingStore,
                Clock.fixed(EVENT_TIME, ZoneOffset.UTC));

        assertDoesNotThrow(() -> service.recordLoginSuccess(42L));
        assertDoesNotThrow(() -> service.recordLoginFailure(
                AuthSecurityEventReasonCode.INVALID_CREDENTIALS));
        assertDoesNotThrow(() -> service.recordAuthRateLimited(
                AuthSecurityEventReasonCode.LOGIN_RATE_LIMITED));
    }

    private static void assertEvent(
            AuthSecurityEvent event,
            AuthSecurityEventType type,
            AuthSecurityEventOutcome outcome,
            Long userId,
            String reasonCode) {
        assertEquals(type, event.getEventType());
        assertEquals(outcome, event.getOutcome());
        assertEquals(userId, event.getUserId());
        if (reasonCode == null) {
            assertNull(event.getReasonCode());
        } else {
            assertEquals(reasonCode, event.getReasonCode());
        }
        assertEquals("auth", event.getSource());
        assertEquals(EVENT_TIME, event.getOccurredAt().toInstant(ZoneOffset.UTC));
        assertEquals(event.getOccurredAt(), event.getCreatedAt());
    }
}
