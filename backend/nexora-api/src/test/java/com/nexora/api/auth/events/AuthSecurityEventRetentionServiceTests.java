package com.nexora.api.auth.events;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class AuthSecurityEventRetentionServiceTests {

    private static final Instant CLEANUP_TIME = Instant.parse("2026-08-25T12:00:00Z");

    @Test
    void disabledCleanupReturnsZeroWithoutCallingStore() {
        AuthSecurityEventRetentionProperties properties =
                new AuthSecurityEventRetentionProperties();
        CapturingStore store = new CapturingStore(4);
        AuthSecurityEventRetentionService service = service(properties, store);

        assertEquals(0, service.cleanupExpiredEvents());
        assertEquals(0, store.deleteCalls);
        assertNull(store.cutoff);
    }

    @Test
    void enabledCleanupCalculatesUtcCutoffAndReturnsDeletedCount() {
        AuthSecurityEventRetentionProperties properties = enabledProperties(30);
        CapturingStore store = new CapturingStore(4);
        AuthSecurityEventRetentionService service = service(properties, store);

        assertEquals(4, service.cleanupExpiredEvents());
        assertEquals(1, store.deleteCalls);
        assertEquals(LocalDateTime.of(2026, 7, 26, 12, 0), store.cutoff);
    }

    @Test
    void scheduledCleanupSuppressesStoreFailureWithoutExposingItToCaller() {
        AuthSecurityEventRetentionProperties properties = enabledProperties(30);
        AuthSecurityEventStore failingStore = new AuthSecurityEventStore() {
            @Override
            public AuthSecurityEvent save(AuthSecurityEvent event) {
                return event;
            }

            @Override
            public List<AuthSecurityEvent> findAll() {
                return List.of();
            }

            @Override
            public int deleteOlderThan(LocalDateTime cutoff) {
                throw new IllegalStateException("sensitive-value-must-not-be-logged");
            }
        };
        AuthSecurityEventRetentionService service = service(properties, failingStore);

        assertDoesNotThrow(service::scheduledCleanup);
        assertEquals(0, service.cleanupExpiredEvents());
    }

    private static AuthSecurityEventRetentionService service(
            AuthSecurityEventRetentionProperties properties,
            AuthSecurityEventStore store) {
        return new AuthSecurityEventRetentionService(
                properties,
                store,
                Clock.fixed(CLEANUP_TIME, ZoneOffset.UTC));
    }

    private static AuthSecurityEventRetentionProperties enabledProperties(int retentionDays) {
        AuthSecurityEventRetentionProperties properties =
                new AuthSecurityEventRetentionProperties();
        properties.setCleanupEnabled(true);
        properties.setRetentionDays(retentionDays);
        return properties;
    }

    private static final class CapturingStore implements AuthSecurityEventStore {

        private final int deletedCount;
        private int deleteCalls;
        private LocalDateTime cutoff;

        private CapturingStore(int deletedCount) {
            this.deletedCount = deletedCount;
        }

        @Override
        public AuthSecurityEvent save(AuthSecurityEvent event) {
            return event;
        }

        @Override
        public List<AuthSecurityEvent> findAll() {
            return List.of();
        }

        @Override
        public int deleteOlderThan(LocalDateTime cutoff) {
            deleteCalls++;
            this.cutoff = cutoff;
            return deletedCount;
        }
    }
}
