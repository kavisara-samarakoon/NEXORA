package com.nexora.api.health;

import com.nexora.api.notifications.NotificationProperties;
import com.nexora.api.sentinel.gateway.SentinelAiProperties;
import com.nexora.api.wishlist.WishlistPriceRefreshProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class RuntimeHealthService {

    static final String OBSERVABILITY_CONTRACT_MILESTONE =
            "v0.33.0-runtime-observability-foundation";

    private static final String STATUS = "UP";
    private static final String SERVICE = "NEXORA API";
    private static final Set<String> SAFE_PROFILE_LABELS = Set.of(
            "default", "dev", "local", "prod", "production", "test");
    private static final Set<String> NOTIFICATION_PROVIDERS = Set.of("log", "email");
    private static final Set<String> PRICE_REFRESH_PROVIDERS = Set.of("stored", "cheapshark");

    private final Environment environment;
    private final SentinelAiProperties sentinelProperties;
    private final NotificationProperties notificationProperties;
    private final WishlistPriceRefreshProperties priceRefreshProperties;
    private final Clock clock;
    private final Instant startedAtUtc;

    @Autowired
    public RuntimeHealthService(
            Environment environment,
            SentinelAiProperties sentinelProperties,
            NotificationProperties notificationProperties,
            WishlistPriceRefreshProperties priceRefreshProperties) {
        this(
                environment,
                sentinelProperties,
                notificationProperties,
                priceRefreshProperties,
                Clock.systemUTC());
    }

    RuntimeHealthService(
            Environment environment,
            SentinelAiProperties sentinelProperties,
            NotificationProperties notificationProperties,
            WishlistPriceRefreshProperties priceRefreshProperties,
            Clock clock) {
        this.environment = environment;
        this.sentinelProperties = sentinelProperties;
        this.notificationProperties = notificationProperties;
        this.priceRefreshProperties = priceRefreshProperties;
        this.clock = clock;
        this.startedAtUtc = clock.instant();
    }

    public HealthResponse getHealth() {
        Instant checkedAtUtc = clock.instant();
        boolean production = productionProfileActive();
        boolean dev = environment.acceptsProfiles(Profiles.of("dev"));
        String runtimeMode = production ? "production" : dev ? "dev-postgres" : "local-demo";
        String dataMode = dev ? "postgres-dev" : "in-memory-demo";
        String sentinelProvider = safeSentinelProvider();
        String notificationProvider = safeProvider(
                notificationProperties.getProvider(),
                NOTIFICATION_PROVIDERS);
        String priceRefreshProvider = safePriceRefreshProvider();

        return new HealthResponse(
                STATUS,
                SERVICE,
                OBSERVABILITY_CONTRACT_MILESTONE,
                OBSERVABILITY_CONTRACT_MILESTONE,
                runtimeMode,
                safeActiveProfiles(),
                dataMode,
                sentinelProvider,
                notificationProvider,
                priceRefreshProvider,
                startedAtUtc,
                checkedAtUtc,
                uptimeSeconds(checkedAtUtc),
                checks(
                        production,
                        dev,
                        sentinelProvider,
                        notificationProvider,
                        priceRefreshProvider));
    }

    private Map<String, String> checks(
            boolean production,
            boolean dev,
            String sentinelProvider,
            String notificationProvider,
            String priceRefreshProvider) {
        Map<String, String> checks = new LinkedHashMap<>();
        checks.put("application", "ready");
        checks.put("profile", profileCheck(production, dev));
        checks.put("authProductionGuard", production ? "active" : "inactive");
        checks.put("database", databaseCheck(production, dev));
        checks.put(
                "sentinel",
                "gemini".equals(sentinelProvider)
                        ? "gemini-provider-configured"
                        : sentinelProvider + "-provider");
        checks.put(
                "notifications",
                notificationProvider + "-provider-"
                        + (notificationProperties.isEnabled() ? "enabled" : "disabled"));
        checks.put("priceRefresh", priceRefreshProvider + "-provider");
        return checks;
    }

    private boolean productionProfileActive() {
        return environment.acceptsProfiles(Profiles.of("prod", "production"));
    }

    private List<String> safeActiveProfiles() {
        String[] activeProfiles = environment.getActiveProfiles();
        if (activeProfiles.length == 0) {
            return List.of("default");
        }

        LinkedHashSet<String> safeProfiles = new LinkedHashSet<>();
        Arrays.stream(activeProfiles)
                .map(RuntimeHealthService::safeProfileLabel)
                .forEach(safeProfiles::add);
        return List.copyOf(safeProfiles);
    }

    private String safeSentinelProvider() {
        return sentinelProperties.isGeminiConfigured() ? "gemini" : "local";
    }

    private String safePriceRefreshProvider() {
        if (priceRefreshProperties.getCheapshark() != null
                && priceRefreshProperties.getCheapshark().isEnabled()) {
            return "cheapshark";
        }
        return safeProvider(
                priceRefreshProperties.getProvider(),
                PRICE_REFRESH_PROVIDERS);
    }

    private long uptimeSeconds(Instant checkedAtUtc) {
        return Math.max(0, Duration.between(startedAtUtc, checkedAtUtc).getSeconds());
    }

    private static String safeProfileLabel(String profile) {
        if (profile == null) {
            return "custom";
        }
        String normalized = profile.trim().toLowerCase(Locale.ROOT);
        return SAFE_PROFILE_LABELS.contains(normalized) ? normalized : "custom";
    }

    private static String safeProvider(String provider, Set<String> allowedProviders) {
        if (provider == null) {
            return "unsupported";
        }
        String normalized = provider.trim().toLowerCase(Locale.ROOT);
        return allowedProviders.contains(normalized) ? normalized : "unsupported";
    }

    private static String profileCheck(boolean production, boolean dev) {
        if (production) {
            return "production";
        }
        return dev ? "dev" : "default";
    }

    private static String databaseCheck(boolean production, boolean dev) {
        if (dev) {
            return "configured-by-dev-profile";
        }
        return production ? "not-configured-by-runtime-profile" : "not-required";
    }
}
