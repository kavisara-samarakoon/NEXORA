package com.nexora.api.sentinel;

public record SentinelStatusResponse(
        String aiStatus,
        String backend,
        String geminiApi,
        String privacy
) {
}

