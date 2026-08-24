package com.nexora.api.sentinel.gateway;

import java.time.Instant;

public record SentinelProviderHealthSnapshot(
        Instant lastGeminiSuccessAt,
        Instant lastGeminiFallbackAt,
        SentinelProviderFallbackReason lastFallbackReason,
        int consecutiveGeminiFailures,
        long totalLocalFallbackCount,
        long totalGeminiSuccessCount) {
}
