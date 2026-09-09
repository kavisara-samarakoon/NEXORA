package com.nexora.api.sentinel.gateway;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.util.LinkedHashMap;

@Component
public class SentinelRateLimiter {

    static final int MAX_WINDOWS = 10_000;

    private final SentinelAiProperties properties;
    private final Clock clock;
    private final int maxWindows;
    private final LinkedHashMap<Long, RequestWindow> windows = new LinkedHashMap<>();

    @Autowired
    public SentinelRateLimiter(SentinelAiProperties properties) {
        this(properties, Clock.systemUTC());
    }

    SentinelRateLimiter(SentinelAiProperties properties, Clock clock) {
        this(properties, clock, MAX_WINDOWS);
    }

    SentinelRateLimiter(SentinelAiProperties properties, Clock clock, int maxWindows) {
        if (maxWindows < 1) {
            throw new IllegalArgumentException("maxWindows must be positive");
        }
        this.properties = properties;
        this.clock = clock;
        this.maxWindows = maxWindows;
    }

    public synchronized SentinelRateLimitResult check(long userId) {
        SentinelAiProperties.Safety safety = properties.getSafety();
        if (!safety.isRateLimitEnabled()) {
            return SentinelRateLimitResult.permitted();
        }

        long nowMillis = clock.millis();
        long windowMillis = safety.boundedRateLimitWindowSeconds() * 1_000L;
        int maxRequests = safety.boundedRateLimitMaxRequests();
        cleanupExpiredWindows(nowMillis, windowMillis);

        RequestWindow existing = windows.get(userId);
        if (existing == null) {
            // Expired entries are already gone; insertion order breaks age ties deterministically.
            if (windows.size() >= maxWindows) {
                var oldest = windows.keySet().iterator();
                oldest.next();
                oldest.remove();
            }
            windows.put(userId, new RequestWindow(nowMillis, 1));
            return SentinelRateLimitResult.permitted();
        }
        if (existing.requestCount() < maxRequests) {
            windows.put(userId, new RequestWindow(existing.startedAtMillis(), existing.requestCount() + 1));
            return SentinelRateLimitResult.permitted();
        }

        long remainingMillis = windowMillis - (nowMillis - existing.startedAtMillis());
        long retryAfterSeconds = Math.max(1, (remainingMillis + 999L) / 1_000L);
        return SentinelRateLimitResult.rejected(retryAfterSeconds);
    }

    synchronized int activeWindowCount() {
        return windows.size();
    }

    private void cleanupExpiredWindows(long nowMillis, long windowMillis) {
        windows.entrySet().removeIf(entry ->
                nowMillis - entry.getValue().startedAtMillis() >= windowMillis);
    }

    private record RequestWindow(long startedAtMillis, int requestCount) {
    }
}
