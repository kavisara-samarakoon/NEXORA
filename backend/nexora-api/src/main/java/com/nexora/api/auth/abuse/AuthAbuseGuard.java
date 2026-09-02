package com.nexora.api.auth.abuse;

import com.nexora.api.auth.events.AuthSecurityEventService;
import org.springframework.stereotype.Service;

@Service
public class AuthAbuseGuard {

    private static final String SHARED_SUBJECT = "shared-operation-subject";

    private final AuthAbuseControlProperties properties;
    private final InMemoryAuthAbuseCounterStore counterStore;
    private final AuthSecurityEventService securityEventService;

    public AuthAbuseGuard(
            AuthAbuseControlProperties properties,
            InMemoryAuthAbuseCounterStore counterStore,
            AuthSecurityEventService securityEventService) {
        this.properties = properties;
        this.counterStore = counterStore;
        this.securityEventService = securityEventService;
    }

    public void check(AuthAbuseLimit limit) {
        check(limit, SHARED_SUBJECT);
    }

    public void check(AuthAbuseLimit limit, String subject) {
        if (!properties.isEnabled()) {
            return;
        }

        AuthAbuseDecision decision = counterStore.check(
                limit,
                subject,
                properties.boundedMaxAttempts(limit),
                properties.boundedWindowSeconds());
        if (!decision.allowed()) {
            securityEventService.recordAuthRateLimited(limit.reasonCode());
            throw new AuthRateLimitExceededException(decision.retryAfterSeconds());
        }
    }
}
