package com.nexora.api.sentinel.gateway;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.AtomicReference;

@Component
public class SentinelRateLimiter {

    private static final long CLEANUP_INTERVAL = 64;

    private final SentinelAiProperties properties;
    private final Clock clock;
    private final ConcurrentHashMap<Long, RequestWindow> windows = new ConcurrentHashMap<>();
    private final AtomicLong requestCounter = new AtomicLong();

    @Autowired
    public SentinelRateLimiter(SentinelAiProperties properties) {
        this(properties, Clock.systemUTC());
    }

    SentinelRateLimiter(SentinelAiProperties properties, Clock clock) {
        this.properties = properties;
        this.clock = clock;
    }

    public SentinelRateLimitResult check(long userId) {
        SentinelAiProperties.Safety safety = properties.getSafety();
        if (!safety.isRateLimitEnabled()) {
            return SentinelRateLimitResult.permitted();
        }

        long nowMillis = clock.millis();
        long windowMillis = safety.boundedRateLimitWindowSeconds() * 1_000L;
        int maxRequests = safety.boundedRateLimitMaxRequests();
        cleanupExpiredWindows(nowMillis, windowMillis);

        AtomicReference<SentinelRateLimitResult> result = new AtomicReference<>();
        windows.compute(userId, (ignored, existing) -> {
            if (existing == null || nowMillis - existing.startedAtMillis() >= windowMillis) {
                result.set(SentinelRateLimitResult.permitted());
                return new RequestWindow(nowMillis, 1);
            }
            if (existing.requestCount() < maxRequests) {
                result.set(SentinelRateLimitResult.permitted());
                return new RequestWindow(existing.startedAtMillis(), existing.requestCount() + 1);
            }

            long remainingMillis = windowMillis - (nowMillis - existing.startedAtMillis());
            long retryAfterSeconds = Math.max(1, (remainingMillis + 999L) / 1_000L);
            result.set(SentinelRateLimitResult.rejected(retryAfterSeconds));
            return existing;
        });
        return result.get();
    }

    private void cleanupExpiredWindows(long nowMillis, long windowMillis) {
        if (requestCounter.incrementAndGet() % CLEANUP_INTERVAL != 0) {
            return;
        }
        windows.entrySet().removeIf(entry ->
                nowMillis - entry.getValue().startedAtMillis() >= windowMillis);
    }

    private record RequestWindow(long startedAtMillis, int requestCount) {
    }
}
