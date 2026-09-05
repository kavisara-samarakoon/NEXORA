package com.nexora.api.health;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record HealthResponse(
        String status,
        String service,
        String milestone,
        String observabilityContractMilestone,
        String runtimeMode,
        List<String> activeProfiles,
        String dataMode,
        String sentinelProvider,
        String notificationProvider,
        String priceRefreshProvider,
        Instant startedAtUtc,
        Instant checkedAtUtc,
        long uptimeSeconds,
        Map<String, String> checks) {

    public HealthResponse {
        activeProfiles = List.copyOf(activeProfiles);
        checks = Map.copyOf(checks);
    }
}
