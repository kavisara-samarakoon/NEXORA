package com.nexora.api.sentinel.gateway;

import java.time.Instant;
import java.util.List;

public record SentinelInsightResponse(
        String mode,
        String provider,
        String context,
        String title,
        String answer,
        List<String> recommendations,
        List<String> safetyNotes,
        List<String> nextActions,
        String fallbackReason,
        Instant createdAt) {
}
