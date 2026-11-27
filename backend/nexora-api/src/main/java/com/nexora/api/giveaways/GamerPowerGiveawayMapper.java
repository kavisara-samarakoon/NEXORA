package com.nexora.api.giveaways;

import org.springframework.stereotype.Component;

import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

@Component
public class GamerPowerGiveawayMapper {

    private static final DateTimeFormatter GAMERPOWER_DATE_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss", Locale.ROOT);
    private static final String SOURCE = "gamerpower";
    private static final String SOURCE_ATTRIBUTION = "GamerPower";

    private final Clock clock;

    public GamerPowerGiveawayMapper() {
        this(Clock.systemUTC());
    }

    GamerPowerGiveawayMapper(Clock clock) {
        this.clock = clock;
    }

    public List<LiveGiveaway> toLiveGiveaways(List<GamerPowerGiveawayResponse> responses) {
        if (responses == null) {
            return List.of();
        }
        Instant now = clock.instant();
        return responses.stream()
                .map(response -> toLiveGiveawayIfValid(response, now))
                .filter(Objects::nonNull)
                .toList();
    }

    private LiveGiveaway toLiveGiveawayIfValid(
            GamerPowerGiveawayResponse response,
            Instant now) {
        if (response == null || response.id() == null || response.id() <= 0
                || isBlank(response.title())) {
            return null;
        }

        String claimUrl = firstSafeGamerPowerUrl(
                response.openGiveawayUrl(),
                response.openGiveaway(),
                response.gamerpowerUrl()
        );
        if (claimUrl == null) {
            return null;
        }

        Instant publishedAt = parseTimestamp(response.publishedDate());
        Instant endsAt = parseTimestamp(response.endDate());
        String status = resolveStatus(response.status(), endsAt, now);
        Integer daysRemaining = computeDaysRemaining(endsAt, status, now);

        return new LiveGiveaway(
                response.id(),
                response.title().trim(),
                cleanText(response.description()),
                cleanText(response.instructions()),
                cleanWorth(response.worth()),
                safeHttpsMediaUrl(response.thumbnail()),
                safeHttpsMediaUrl(response.image()),
                normalizePlatformLabel(response.platforms()),
                cleanText(response.platforms()),
                normalizeType(response.type()),
                status,
                publishedAt,
                endsAt,
                daysRemaining,
                claimUrl,
                SOURCE,
                SOURCE_ATTRIBUTION
        );
    }

    static String resolveStatus(String rawStatus, Instant endsAt, Instant now) {
        if (endsAt != null && endsAt.isBefore(now)) {
            return "expired";
        }
        if (isBlank(rawStatus)) {
            return "unknown";
        }
        String normalized = rawStatus.trim().toLowerCase(Locale.ROOT);
        if ("active".equals(normalized)) {
            return "active";
        }
        if ("expired".equals(normalized) || "inactive".equals(normalized) || "ended".equals(normalized)) {
            return "expired";
        }
        return "unknown";
    }

    private static Integer computeDaysRemaining(Instant endsAt, String status, Instant now) {
        if (endsAt == null) {
            return null;
        }
        if ("expired".equals(status) || endsAt.isBefore(now)) {
            return 0;
        }
        long hours = Duration.between(now, endsAt).toHours();
        return (int) Math.max(0L, (hours + 23L) / 24L);
    }

    static String normalizePlatformLabel(String rawPlatforms) {
        if (isBlank(rawPlatforms)) {
            return "Other";
        }
        String lower = rawPlatforms.toLowerCase(Locale.ROOT);
        if (lower.contains("epic games")) return "Epic Games";
        if (lower.contains("steam")) return "Steam";
        if (lower.contains("gog")) return "GOG";
        if (lower.contains("prime")) return "Prime Gaming";
        if (lower.contains("itch.io")) return "itch.io";
        if (lower.contains("android") || lower.contains("ios")) return "Mobile";
        if (lower.contains("playstation") || lower.contains("ps4") || lower.contains("ps5")
                || lower.contains("xbox") || lower.contains("switch")) return "Console";
        if (lower.contains("pc")) return "PC";
        return rawPlatforms.split(",")[0].trim();
    }

    private static String normalizeType(String rawType) {
        if (isBlank(rawType)) return "Other";
        return rawType.trim();
    }

    private static String cleanWorth(String worth) {
        if (isBlank(worth)) return null;
        String trimmed = worth.trim();
        return "N/A".equalsIgnoreCase(trimmed) ? null : trimmed;
    }

    private static String cleanText(String value) {
        if (isBlank(value)) return null;
        return value.replace("\r\n", "\n").trim();
    }

    private static Instant parseTimestamp(String raw) {
        if (isBlank(raw)) return null;
        String trimmed = raw.trim();
        if ("N/A".equalsIgnoreCase(trimmed)) return null;
        try {
            return LocalDateTime.parse(trimmed, GAMERPOWER_DATE_FORMAT).toInstant(ZoneOffset.UTC);
        } catch (DateTimeParseException exception) {
            return null;
        }
    }

    static String firstSafeGamerPowerUrl(String... candidates) {
        for (String candidate : candidates) {
            String safe = safeGamerPowerUrl(candidate);
            if (safe != null) return safe;
        }
        return null;
    }

    static String safeGamerPowerUrl(String rawUrl) {
        if (isBlank(rawUrl)) return null;
        String candidate = rawUrl.trim();
        if (candidate.length() > 512 || candidate.chars().anyMatch(Character::isWhitespace)) {
            return null;
        }
        try {
            URI uri = URI.create(candidate);
            if (!"https".equalsIgnoreCase(uri.getScheme())) return null;
            if (uri.getUserInfo() != null || uri.getHost() == null) return null;
            String host = uri.getHost().toLowerCase(Locale.ROOT);
            if (!"www.gamerpower.com".equals(host) && !"gamerpower.com".equals(host)) {
                return null;
            }
            return uri.toASCIIString();
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    static String safeHttpsMediaUrl(String rawUrl) {
        if (isBlank(rawUrl)) return null;
        String candidate = rawUrl.trim();
        if (candidate.length() > 512 || candidate.chars().anyMatch(Character::isWhitespace)) {
            return null;
        }
        try {
            URI uri = URI.create(candidate);
            if (!"https".equalsIgnoreCase(uri.getScheme())) return null;
            if (uri.getUserInfo() != null || uri.getHost() == null || uri.getHost().isBlank()) {
                return null;
            }
            String host = uri.getHost().toLowerCase(Locale.ROOT);
            if ("localhost".equals(host) || host.endsWith(".local") || host.endsWith(".internal")) {
                return null;
            }
            return uri.toASCIIString();
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
