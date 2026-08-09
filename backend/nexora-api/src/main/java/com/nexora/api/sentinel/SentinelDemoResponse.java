package com.nexora.api.sentinel;

import java.util.List;

public record SentinelDemoResponse(
        List<SentinelMessage> messages,
        List<String> suggestions,
        List<SentinelCapability> capabilities,
        List<SentinelStatusItem> systemStatus
) {
}

