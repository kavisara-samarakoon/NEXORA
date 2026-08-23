package com.nexora.api.sentinel.gateway;

import java.util.regex.Pattern;

final class SentinelPromptSanitizer {

    private static final Pattern GOOGLE_API_KEY =
            Pattern.compile("AIza[0-9A-Za-z_-]{20,}");
    private static final Pattern BEARER_TOKEN =
            Pattern.compile("(?i)\\bBearer\\s+[A-Za-z0-9._~+/=-]{8,}");
    private static final Pattern ASSIGNED_SECRET = Pattern.compile(
            "(?i)\\b(?:api[_ -]?key|access[_ -]?token|refresh[_ -]?token|password|otp)"
                    + "\\s*[:=]\\s*\\S+");
    private static final Pattern EMAIL = Pattern.compile(
            "(?i)\\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}\\b");
    private static final Pattern WHITESPACE = Pattern.compile("\\s+");

    private SentinelPromptSanitizer() {
    }

    static String contextValue(String value) {
        return sanitize(value, 180);
    }

    static String userMessage(String value) {
        return sanitize(value, 500);
    }

    private static String sanitize(String value, int maxLength) {
        if (value == null || value.isBlank()) {
            return "not available";
        }

        String normalized = WHITESPACE.matcher(value).replaceAll(" ").trim();
        normalized = GOOGLE_API_KEY.matcher(normalized).replaceAll("[redacted secret]");
        normalized = BEARER_TOKEN.matcher(normalized).replaceAll("Bearer [redacted secret]");
        normalized = ASSIGNED_SECRET.matcher(normalized).replaceAll("[redacted secret]");
        normalized = EMAIL.matcher(normalized).replaceAll("[redacted email]");
        normalized = normalized
                .replace("&", "and")
                .replace("<", "[")
                .replace(">", "]");
        return normalized.substring(0, Math.min(normalized.length(), maxLength));
    }
}
