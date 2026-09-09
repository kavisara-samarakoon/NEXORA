package com.nexora.api.auth.abuse;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.util.LinkedHashMap;

@Component
public class InMemoryAuthAbuseCounterStore {

    static final int MAX_WINDOWS = 10_000;

    private final Clock clock;
    private final int maxWindows;
    private final LinkedHashMap<AuthAbuseKey, AttemptWindow> windows = new LinkedHashMap<>();

    @Autowired
    public InMemoryAuthAbuseCounterStore() {
        this(Clock.systemUTC());
    }

    InMemoryAuthAbuseCounterStore(Clock clock) {
        this(clock, MAX_WINDOWS);
    }

    InMemoryAuthAbuseCounterStore(Clock clock, int maxWindows) {
        if (maxWindows < 1) {
            throw new IllegalArgumentException("maxWindows must be positive");
        }
        this.clock = clock;
        this.maxWindows = maxWindows;
    }

    public synchronized AuthAbuseDecision check(
            AuthAbuseLimit limit,
            String subject,
            int maxAttempts,
            int windowSeconds) {
        long nowMillis = clock.millis();
        long windowMillis = windowSeconds * 1_000L;
        AuthAbuseKey key = AuthAbuseKey.scoped(limit, subject);
        windows.entrySet().removeIf(entry -> isExpired(entry.getValue(), nowMillis, windowMillis));

        AttemptWindow existing = windows.get(key);
        if (existing == null) {
            // Expired entries are already gone; insertion order breaks age ties deterministically.
            if (windows.size() >= maxWindows) {
                var oldest = windows.keySet().iterator();
                oldest.next();
                oldest.remove();
            }
            windows.put(key, new AttemptWindow(nowMillis, 1));
            return AuthAbuseDecision.permitted();
        }
        if (existing.attemptCount() < maxAttempts) {
            windows.put(key, new AttemptWindow(existing.startedAtMillis(), existing.attemptCount() + 1));
            return AuthAbuseDecision.permitted();
        }

        long remainingMillis = windowMillis - (nowMillis - existing.startedAtMillis());
        long retryAfterSeconds = Math.max(1, (remainingMillis + 999L) / 1_000L);
        return AuthAbuseDecision.rejected(retryAfterSeconds);
    }

    synchronized int activeWindowCount() {
        return windows.size();
    }

    private static boolean isExpired(AttemptWindow window, long nowMillis, long windowMillis) {
        return nowMillis - window.startedAtMillis() >= windowMillis;
    }

    private record AttemptWindow(long startedAtMillis, int attemptCount) {
    }
}
