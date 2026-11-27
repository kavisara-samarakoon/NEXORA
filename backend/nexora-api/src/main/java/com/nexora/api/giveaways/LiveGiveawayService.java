package com.nexora.api.giveaways;

import com.nexora.api.deals.ExternalProviderRequestBudget;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LiveGiveawayService {

    private static final Logger LOGGER = LoggerFactory.getLogger(LiveGiveawayService.class);
    private static final String SOURCE_ATTRIBUTION = "GamerPower";
    private static final String SOURCE_URL = "https://www.gamerpower.com";
    private static final int MAX_CACHE_ENTRIES = 32;

    private final GamerPowerGiveawayClient client;
    private final GamerPowerGiveawayMapper mapper;
    private final ExternalGiveawaysProperties properties;
    private final ExternalProviderRequestBudget requestBudget;
    private final Clock clock;
    private final LinkedHashMap<CacheKey, CacheEntry> cache = new LinkedHashMap<>(16, 0.75f, true);
    private final ConcurrentHashMap<CacheKey, CompletableFuture<LoadResult>> activeLoads =
            new ConcurrentHashMap<>();

    @Autowired
    public LiveGiveawayService(
            GamerPowerGiveawayClient client,
            GamerPowerGiveawayMapper mapper,
            ExternalGiveawaysProperties properties,
            ExternalProviderRequestBudget requestBudget) {
        this(client, mapper, properties, requestBudget, Clock.systemUTC());
    }

    LiveGiveawayService(
            GamerPowerGiveawayClient client,
            GamerPowerGiveawayMapper mapper,
            ExternalGiveawaysProperties properties,
            ExternalProviderRequestBudget requestBudget,
            Clock clock) {
        this.client = client;
        this.mapper = mapper;
        this.properties = properties;
        this.requestBudget = requestBudget;
        this.clock = clock;
    }

    public LiveGiveawaysResponse getLiveGiveaways(String platform, String type) {
        if (!properties.isEnabled()) {
            return unavailable("Live giveaways provider is disabled in configuration.");
        }

        String safePlatform = GamerPowerGiveawayClient.normalizePlatform(platform);
        String safeType = GamerPowerGiveawayClient.normalizeType(type);
        CacheKey key = new CacheKey(
                safePlatform == null ? "" : safePlatform,
                safeType == null ? "" : safeType
        );

        try {
            LoadResult result = properties.getCache().isEnabled()
                    ? loadWithCache(key, safePlatform, safeType)
                    : new LoadResult(
                            mapper.toLiveGiveaways(
                                    requestBudget.execute(() -> client.getGiveaways(safePlatform, safeType))
                            ),
                            "live",
                            clock.instant()
                    );

            String notice = "stale".equals(result.cacheState())
                    ? "Live refresh failed; serving the last cached GamerPower snapshot."
                    : null;
            return new LiveGiveawaysResponse(
                    result.giveaways(),
                    "gamerpower",
                    SOURCE_ATTRIBUTION,
                    SOURCE_URL,
                    result.cacheState(),
                    result.fetchedAtUtc(),
                    notice
            );
        } catch (RuntimeException exception) {
            LOGGER.warn("GamerPower giveaways unavailable ({})", exception.getMessage());
            return unavailable(
                    "Live giveaways could not be retrieved from GamerPower right now."
            );
        }
    }

    public synchronized void clearCache() {
        cache.clear();
    }

    private LoadResult loadWithCache(CacheKey key, String platform, String type) {
        CacheEntry fresh = getFreshEntry(key);
        if (fresh != null) {
            return new LoadResult(fresh.giveaways(), "cached", fresh.fetchedAtUtc());
        }

        CompletableFuture<LoadResult> newLoad = new CompletableFuture<>();
        CompletableFuture<LoadResult> existingLoad = activeLoads.putIfAbsent(key, newLoad);
        if (existingLoad != null) {
            return await(existingLoad);
        }

        try {
            LoadResult loaded = fetchAndStore(key, platform, type);
            newLoad.complete(loaded);
            return loaded;
        } catch (RuntimeException | Error failure) {
            newLoad.completeExceptionally(failure);
            throw failure;
        } finally {
            activeLoads.remove(key, newLoad);
        }
    }

    private LoadResult fetchAndStore(CacheKey key, String platform, String type) {
        CacheEntry stale = getEntryEvenIfExpired(key);
        if (stale != null && stale.isFresh(clock.instant())) {
            return new LoadResult(stale.giveaways(), "cached", stale.fetchedAtUtc());
        }

        try {
            List<LiveGiveaway> giveaways = mapper.toLiveGiveaways(
                    requestBudget.execute(() -> client.getGiveaways(platform, type))
            );
            Instant now = clock.instant();
            putEntry(key, giveaways, now);
            return new LoadResult(giveaways, "live", now);
        } catch (RuntimeException exception) {
            if (stale != null) {
                LOGGER.warn("GamerPower refresh failed; serving stale cached giveaways");
                return new LoadResult(stale.giveaways(), "stale", stale.fetchedAtUtc());
            }
            throw exception;
        }
    }

    private synchronized CacheEntry getFreshEntry(CacheKey key) {
        CacheEntry entry = cache.get(key);
        if (entry != null && entry.isFresh(clock.instant())) {
            return entry;
        }
        return null;
    }

    private synchronized CacheEntry getEntryEvenIfExpired(CacheKey key) {
        return cache.get(key);
    }

    private synchronized void putEntry(CacheKey key, List<LiveGiveaway> giveaways, Instant now) {
        cache.entrySet().removeIf(entry -> !entry.getValue().isFresh(now));
        while (cache.size() >= MAX_CACHE_ENTRIES && !cache.containsKey(key)) {
            Iterator<CacheKey> iterator = cache.keySet().iterator();
            if (!iterator.hasNext()) break;
            iterator.next();
            iterator.remove();
        }
        cache.put(key, new CacheEntry(
                List.copyOf(giveaways),
                now,
                now.plus(properties.getCache().ttl())
        ));
    }

    private static <T> T await(CompletableFuture<T> future) {
        try {
            return future.join();
        } catch (CompletionException exception) {
            Throwable cause = exception.getCause();
            if (cause instanceof RuntimeException runtimeException) {
                throw runtimeException;
            }
            if (cause instanceof Error error) {
                throw error;
            }
            throw exception;
        }
    }

    private static LiveGiveawaysResponse unavailable(String notice) {
        return new LiveGiveawaysResponse(
                List.of(),
                "unavailable",
                SOURCE_ATTRIBUTION,
                SOURCE_URL,
                "unavailable",
                null,
                notice
        );
    }

    private record CacheKey(String platform, String type) {
    }

    private record CacheEntry(
            List<LiveGiveaway> giveaways,
            Instant fetchedAtUtc,
            Instant expiresAtUtc
    ) {
        boolean isFresh(Instant now) {
            return now.isBefore(expiresAtUtc);
        }
    }

    private record LoadResult(
            List<LiveGiveaway> giveaways,
            String cacheState,
            Instant fetchedAtUtc
    ) {
    }
}
