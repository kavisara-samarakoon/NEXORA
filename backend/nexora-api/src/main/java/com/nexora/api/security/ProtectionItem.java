package com.nexora.api.security;

public record ProtectionItem(
        long id,
        String icon,
        String label,
        String description,
        String status,
        String statusType
) {
}

