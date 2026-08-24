package com.nexora.api.sentinel.gateway;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.util.Objects;

@Service
public class SentinelProviderHealthService {

    private final Clock clock;
    private Instant lastGeminiSuccessAt;
    private Instant lastGeminiFallbackAt;
    private SentinelProviderFallbackReason lastFallbackReason;
    private int consecutiveGeminiFailures;
    private long totalLocalFallbackCount;
    private long totalGeminiSuccessCount;

    @Autowired
    public SentinelProviderHealthService() {
        this(Clock.systemUTC());
    }

    SentinelProviderHealthService(Clock clock) {
        this.clock = clock;
    }

    public synchronized void recordGeminiSuccess() {
        lastGeminiSuccessAt = clock.instant();
        consecutiveGeminiFailures = 0;
        totalGeminiSuccessCount++;
    }

    public synchronized void recordGeminiFallback(SentinelProviderFallbackReason reason) {
        lastGeminiFallbackAt = clock.instant();
        lastFallbackReason = Objects.requireNonNull(reason, "reason");
        consecutiveGeminiFailures++;
        totalLocalFallbackCount++;
    }

    public synchronized SentinelProviderHealthSnapshot snapshot() {
        return new SentinelProviderHealthSnapshot(
                lastGeminiSuccessAt,
                lastGeminiFallbackAt,
                lastFallbackReason,
                consecutiveGeminiFailures,
                totalLocalFallbackCount,
                totalGeminiSuccessCount);
    }
}
