package com.nexora.api.auth.events;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Service
public class AuthSecurityEventRetentionService {

    private static final Logger LOGGER =
            LoggerFactory.getLogger(AuthSecurityEventRetentionService.class);

    private final AuthSecurityEventRetentionProperties properties;
    private final AuthSecurityEventStore store;
    private final Clock clock;

    @Autowired
    public AuthSecurityEventRetentionService(
            AuthSecurityEventRetentionProperties properties,
            AuthSecurityEventStore store) {
        this(properties, store, Clock.systemUTC());
    }

    AuthSecurityEventRetentionService(
            AuthSecurityEventRetentionProperties properties,
            AuthSecurityEventStore store,
            Clock clock) {
        this.properties = properties;
        this.store = store;
        this.clock = clock;
    }

    public int cleanupExpiredEvents() {
        if (!properties.isCleanupEnabled()) {
            return 0;
        }

        LocalDateTime cutoff = LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC)
                .minusDays(properties.boundedRetentionDays());
        try {
            int deletedCount = store.deleteOlderThan(cutoff);
            LOGGER.info(
                    "Auth security event retention cleanup deletedCount={} cutoff={}",
                    deletedCount,
                    cutoff);
            return deletedCount;
        } catch (RuntimeException exception) {
            LOGGER.warn("Auth security event retention cleanup failed cutoff={}", cutoff);
            return 0;
        }
    }

    @Scheduled(cron = "0 0 3 * * *", zone = "UTC")
    public void scheduledCleanup() {
        cleanupExpiredEvents();
    }
}
