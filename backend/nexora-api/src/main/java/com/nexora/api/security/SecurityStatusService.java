package com.nexora.api.security;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SecurityStatusService {

    private static final List<ProtectionItem> ACCOUNT_PROTECTION = List.of(
            new ProtectionItem(1, "key", "Password Security",
                    "Strong password detected — last changed 45 days ago", "Secure", "ok"),
            new ProtectionItem(2, "lock", "MFA Ready",
                    "Two-factor authentication via authenticator app", "Enabled", "ok"),
            new ProtectionItem(3, "device", "Session Control",
                    "2 active sessions across your devices", "Review", "warn"),
            new ProtectionItem(4, "eye", "Suspicious Login Detection",
                    "Monitors sign-ins from unknown devices and locations", "Active", "ok")
    );

    private static final List<ProtectionItem> NETWORK_PROTECTION = List.of(
            new ProtectionItem(1, "tls", "HTTPS / TLS",
                    "All API traffic encrypted with TLS 1.3", "Planned", "planned"),
            new ProtectionItem(2, "bolt", "Rate Limiting",
                    "Request throttling to prevent API abuse", "Planned", "planned"),
            new ProtectionItem(3, "redirect", "Safe Redirects",
                    "Validated store URLs to prevent phishing redirects", "Planned", "planned"),
            new ProtectionItem(4, "gateway", "API Gateway",
                    "Centralized gateway with auth, logging, and routing", "Planned", "planned")
    );

    public SecurityStatusResponse getSecurityStatus() {
        return new SecurityStatusResponse(
                92,
                "Secure",
                2,
                4,
                1,
                ACCOUNT_PROTECTION,
                NETWORK_PROTECTION
        );
    }
}

