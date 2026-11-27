package com.nexora.api.giveaways;

import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Component
public class GamerPowerGiveawayClient {

    private static final String USER_AGENT = "NEXORA/1.0 (external-giveaways-client)";
    private static final Set<String> ALLOWED_PLATFORMS = Set.of(
            "pc", "steam", "epic-games-store", "gog", "itchio", "ps4", "ps5",
            "xbox-one", "xbox-series-xs", "switch", "android", "ios", "vr", "drm-free"
    );
    private static final Set<String> ALLOWED_TYPES = Set.of("game", "loot", "beta");

    private final ExternalGiveawaysProperties properties;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public GamerPowerGiveawayClient(
            ExternalGiveawaysProperties properties,
            ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(properties.timeout())
                .build();
    }

    public List<GamerPowerGiveawayResponse> getGiveaways(String platform, String type) {
        URI uri = buildGiveawaysUri(platform, type);
        HttpRequest request = HttpRequest.newBuilder(uri)
                .timeout(properties.timeout())
                .header("Accept", "application/json")
                .header("User-Agent", USER_AGENT)
                .GET()
                .build();

        try {
            HttpResponse<String> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
            );

            // GamerPower returns 201 with {"status":0,"status_message":"No active giveaways available..."} when empty
            if (response.statusCode() == 404) {
                return List.of();
            }
            if (response.statusCode() == 429) {
                throw new GamerPowerClientException("GamerPower rate limit reached (HTTP 429)");
            }
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new GamerPowerClientException(
                        "GamerPower returned HTTP " + response.statusCode()
                );
            }

            String body = response.body();
            if (body == null || body.isBlank()) {
                return List.of();
            }
            String trimmed = body.trim();
            if (trimmed.startsWith("{")) {
                return List.of();
            }

            GamerPowerGiveawayResponse[] records =
                    objectMapper.readValue(trimmed, GamerPowerGiveawayResponse[].class);
            return records == null ? List.of() : Arrays.asList(records);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new GamerPowerClientException("GamerPower request was interrupted", exception);
        } catch (IOException | JacksonException exception) {
            throw new GamerPowerClientException("GamerPower request failed", exception);
        }
    }

    static String normalizePlatform(String platform) {
        if (platform == null || platform.isBlank()) return null;
        String normalized = platform.trim().toLowerCase(Locale.ROOT);
        return ALLOWED_PLATFORMS.contains(normalized) ? normalized : null;
    }

    static String normalizeType(String type) {
        if (type == null || type.isBlank()) return null;
        String normalized = type.trim().toLowerCase(Locale.ROOT);
        return ALLOWED_TYPES.contains(normalized) ? normalized : null;
    }

    private URI buildGiveawaysUri(String platform, String type) {
        StringBuilder uri = new StringBuilder(normalizedBaseUrl())
                .append("/giveaways?sort-by=date");
        String safePlatform = normalizePlatform(platform);
        String safeType = normalizeType(type);
        if (safePlatform != null) {
            uri.append("&platform=").append(encode(safePlatform));
        }
        if (safeType != null) {
            uri.append("&type=").append(encode(safeType));
        }
        return URI.create(uri.toString());
    }

    private String normalizedBaseUrl() {
        String baseUrl = properties.getGamerpower().getBaseUrl();
        if (baseUrl == null || baseUrl.isBlank()) {
            throw new GamerPowerClientException("GamerPower base URL is not configured");
        }
        String trimmed = baseUrl.trim().replaceAll("/+$", "");
        URI parsed;
        try {
            parsed = URI.create(trimmed);
        } catch (IllegalArgumentException exception) {
            throw new GamerPowerClientException("GamerPower base URL is invalid", exception);
        }
        String scheme = parsed.getScheme();
        String host = parsed.getHost();
        boolean isLocalTest = "http".equalsIgnoreCase(scheme)
                && ("localhost".equalsIgnoreCase(host) || "127.0.0.1".equals(host));
        if (!"https".equalsIgnoreCase(scheme) && !isLocalTest) {
            throw new GamerPowerClientException("GamerPower base URL must use HTTPS");
        }
        return trimmed;
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
