package com.nexora.api.auth.abuse;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;

@Component
public class InMemoryAuthAbuseCounterStore {

    private final Clock clock;
    private final ConcurrentHashMap<AuthAbuseLimit, AttemptWindow> windows = new ConcurrentHashMap<>();

    @Autowired
    public InMemoryAuthAbuseCounterStore() {
        this(Clock.systemUTC());
    }

    InMemoryAuthAbuseCounterStore(Clock clock) {
        this.clock = clock;
    }

    public AuthAbuseDecision check(AuthAbuseLimit limit, int maxAttempts, int windowSeconds) {
        long nowMillis = clock.millis();
        long windowMillis = windowSeconds * 1_000L;
        windows.entrySet().removeIf(entry -> isExpired(entry.getValue(), nowMillis, windowMillis));

        AtomicReference<AuthAbuseDecision> decision = new AtomicReference<>();
        windows.compute(limit, (ignored, existing) -> {
            if (existing == null || isExpired(existing, nowMillis, windowMillis)) {
                decision.set(AuthAbuseDecision.permitted());
                return new AttemptWindow(nowMillis, 1);
            }
            if (existing.attemptCount() < maxAttempts) {
                decision.set(AuthAbuseDecision.permitted());
                return new AttemptWindow(existing.startedAtMillis(), existing.attemptCount() + 1);
            }

            long remainingMillis = windowMillis - (nowMillis - existing.startedAtMillis());
            long retryAfterSeconds = Math.max(1, (remainingMillis + 999L) / 1_000L);
            decision.set(AuthAbuseDecision.rejected(retryAfterSeconds));
            return existing;
        });
        return decision.get();
    }

    int activeWindowCount() {
        return windows.size();
    }

    private static boolean isExpired(AttemptWindow window, long nowMillis, long windowMillis) {
        return nowMillis - window.startedAtMillis() >= windowMillis;
    }

    private record AttemptWindow(long startedAtMillis, int attemptCount) {
    }
}
