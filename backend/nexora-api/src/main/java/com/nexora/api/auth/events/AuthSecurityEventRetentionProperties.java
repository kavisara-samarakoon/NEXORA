package com.nexora.api.auth.events;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "nexora.auth.security-events.retention")
public class AuthSecurityEventRetentionProperties {

    static final int MIN_RETENTION_DAYS = 1;
    static final int MAX_RETENTION_DAYS = 3_650;

    private boolean cleanupEnabled;
    private int retentionDays = 30;

    public boolean isCleanupEnabled() {
        return cleanupEnabled;
    }

    public void setCleanupEnabled(boolean cleanupEnabled) {
        this.cleanupEnabled = cleanupEnabled;
    }

    public int getRetentionDays() {
        return retentionDays;
    }

    public void setRetentionDays(int retentionDays) {
        this.retentionDays = retentionDays;
    }

    public int boundedRetentionDays() {
        return Math.max(MIN_RETENTION_DAYS, Math.min(retentionDays, MAX_RETENTION_DAYS));
    }
}
