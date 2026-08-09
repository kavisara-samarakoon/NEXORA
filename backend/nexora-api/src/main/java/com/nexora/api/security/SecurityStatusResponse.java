package com.nexora.api.security;

import java.util.List;

public record SecurityStatusResponse(
        int securityScore,
        String status,
        int activeSessions,
        int protectedApis,
        int alertCount,
        List<ProtectionItem> accountProtection,
        List<ProtectionItem> networkProtection
) {
}

