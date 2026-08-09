package com.nexora.api.sentinel;

public record SentinelStatusItem(
        String label,
        String value,
        String badge,
        String tone,
        String icon
) {
}

