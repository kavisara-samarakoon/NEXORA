package com.nexora.api.deals;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;

@Service
public class ExternalDealService {

    private static final Logger LOGGER = LoggerFactory.getLogger(ExternalDealService.class);

    private final CheapSharkDealClient cheapSharkDealClient;
    private final CheapSharkDealMapper cheapSharkDealMapper;
    private final CheapSharkStoreDirectory cheapSharkStoreDirectory;
    private final DealCatalogService localDeals;
    private final ExternalDealsProperties properties;
    private final ExternalDealsCache cache;
    private final ExternalProviderRequestBudget providerRequestBudget;
    private final ConcurrentHashMap<ExternalDealsCacheKey, CompletableFuture<List<CheapSharkDealResponse>>>
            dealLoads = new ConcurrentHashMap<>();
    private final AtomicReference<CompletableFuture<Map<String, String>>> storeLookupLoad =
            new AtomicReference<>();

    public ExternalDealService(
            CheapSharkDealClient cheapSharkDealClient,
            CheapSharkDealMapper cheapSharkDealMapper,
            CheapSharkStoreDirectory cheapSharkStoreDirectory,
            DealCatalogService localDeals,
            ExternalDealsProperties properties,
            ExternalDealsCache cache,
            ExternalProviderRequestBudget providerRequestBudget) {
        this.cheapSharkDealClient = cheapSharkDealClient;
        this.cheapSharkDealMapper = cheapSharkDealMapper;
        this.cheapSharkStoreDirectory = cheapSharkStoreDirectory;
        this.localDeals = localDeals;
        this.properties = properties;
        this.cache = cache;
        this.providerRequestBudget = providerRequestBudget;
    }

    public List<Deal> getDeals(String title, Integer pageSize, BigDecimal upperPrice) {
        if (!properties.isEnabled()) {
            return localDeals.getDeals();
        }

        int requestedPageSize = pageSize == null ? properties.getDefaultPageSize() : pageSize;
        int maxPageSize = Math.max(1, properties.getMaxPageSize());
        int effectivePageSize = Math.max(1, Math.min(requestedPageSize, maxPageSize));
        String effectiveTitle = normalizeTitle(title);

        if (!properties.getCache().isEnabled()) {
            return getDealsWithoutCache(effectivePageSize, effectiveTitle, upperPrice);
        }

        ExternalDealsCacheKey cacheKey = ExternalDealsCacheKey.of(
                effectivePageSize,
                effectiveTitle,
                upperPrice
        );

        try {
            List<CheapSharkDealResponse> responses = getDealResponses(
                    cacheKey,
                    effectivePageSize,
                    effectiveTitle,
                    upperPrice
            );
            Map<String, String> storeLookup = getStoreLookup();
            return cheapSharkDealMapper.toDeals(responses, storeLookup);
        } catch (RuntimeException exception) {
            return localFallback(exception);
        }
    }

    private List<Deal> getDealsWithoutCache(
            int effectivePageSize,
            String effectiveTitle,
            BigDecimal upperPrice) {
        try {
            List<CheapSharkDealResponse> responses = providerRequestBudget.execute(
                    () -> cheapSharkDealClient.getDeals(
                            effectivePageSize,
                            effectiveTitle,
                            upperPrice
                    )
            );
            Map<String, String> storeLookup = getStoreLookupWithoutCache();
            return cheapSharkDealMapper.toDeals(responses, storeLookup);
        } catch (RuntimeException exception) {
            return localFallback(exception);
        }
    }

    private List<CheapSharkDealResponse> getDealResponses(
            ExternalDealsCacheKey cacheKey,
            int effectivePageSize,
            String effectiveTitle,
            BigDecimal upperPrice) {
        ExternalDealsCacheEntry<List<CheapSharkDealResponse>> cached = cache.getDeals(cacheKey);
        if (cache.isFresh(cached)) {
            LOGGER.debug("Using cached CheapShark deals");
            return cached.value();
        }

        CompletableFuture<List<CheapSharkDealResponse>> newLoad = new CompletableFuture<>();
        CompletableFuture<List<CheapSharkDealResponse>> activeLoad =
                dealLoads.putIfAbsent(cacheKey, newLoad);
        if (activeLoad != null) {
            return await(activeLoad);
        }

        try {
            List<CheapSharkDealResponse> responses = loadDealResponses(
                    cacheKey,
                    effectivePageSize,
                    effectiveTitle,
                    upperPrice,
                    cached
            );
            newLoad.complete(responses);
            return responses;
        } catch (RuntimeException | Error failure) {
            newLoad.completeExceptionally(failure);
            throw failure;
        } finally {
            dealLoads.remove(cacheKey, newLoad);
        }
    }

    private Map<String, String> getStoreLookup() {
        ExternalDealsCacheEntry<Map<String, String>> cached = cache.getStoreLookup();
        if (cache.isFresh(cached)) {
            LOGGER.debug("Using cached CheapShark store lookup");
            return cached.value();
        }

        CompletableFuture<Map<String, String>> newLoad = new CompletableFuture<>();
        while (!storeLookupLoad.compareAndSet(null, newLoad)) {
            CompletableFuture<Map<String, String>> activeLoad = storeLookupLoad.get();
            if (activeLoad != null) {
                return await(activeLoad);
            }
        }

        try {
            Map<String, String> lookup = loadStoreLookup(cached);
            newLoad.complete(lookup);
            return lookup;
        } catch (RuntimeException | Error failure) {
            newLoad.completeExceptionally(failure);
            throw failure;
        } finally {
            storeLookupLoad.compareAndSet(newLoad, null);
        }
    }

    private List<CheapSharkDealResponse> loadDealResponses(
            ExternalDealsCacheKey cacheKey,
            int effectivePageSize,
            String effectiveTitle,
            BigDecimal upperPrice,
            ExternalDealsCacheEntry<List<CheapSharkDealResponse>> initialCached) {
        ExternalDealsCacheEntry<List<CheapSharkDealResponse>> latestCached = cache.getDeals(cacheKey);
        if (cache.isFresh(latestCached)) {
            return latestCached.value();
        }
        ExternalDealsCacheEntry<List<CheapSharkDealResponse>> stale =
                initialCached != null ? initialCached : latestCached;

        try {
            List<CheapSharkDealResponse> responses = providerRequestBudget.execute(
                    () -> cheapSharkDealClient.getDeals(
                            effectivePageSize,
                            effectiveTitle,
                            upperPrice
                    )
            );
            cache.putDeals(cacheKey, responses);
            return responses;
        } catch (ExternalProviderRequestBudget.CapacityUnavailableException exception) {
            if (stale != null) {
                LOGGER.warn("CheapShark deals request budget saturated; serving stale cached deals");
                return stale.value();
            }
            throw exception;
        } catch (RuntimeException exception) {
            if (stale != null) {
                LOGGER.warn("CheapShark deals refresh failed; serving stale cached deals");
                return stale.value();
            }
            throw exception;
        }
    }

    private Map<String, String> loadStoreLookup(
            ExternalDealsCacheEntry<Map<String, String>> initialCached) {
        ExternalDealsCacheEntry<Map<String, String>> latestCached = cache.getStoreLookup();
        if (cache.isFresh(latestCached)) {
            return latestCached.value();
        }
        ExternalDealsCacheEntry<Map<String, String>> stale =
                initialCached != null ? initialCached : latestCached;

        try {
            Map<String, String> lookup = cheapSharkStoreDirectory.toLookup(
                    providerRequestBudget.execute(cheapSharkDealClient::getStores)
            );
            cache.putStoreLookup(lookup);
            return lookup;
        } catch (RuntimeException exception) {
            if (stale != null) {
                LOGGER.warn("CheapShark stores refresh failed; serving stale cached store lookup");
                return stale.value();
            }
            LOGGER.warn("CheapShark stores unavailable; using fallback store labels");
            return Map.of();
        }
    }

    private static <T> T await(CompletableFuture<T> load) {
        try {
            return load.join();
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

    private Map<String, String> getStoreLookupWithoutCache() {
        try {
            return cheapSharkStoreDirectory.toLookup(
                    providerRequestBudget.execute(cheapSharkDealClient::getStores)
            );
        } catch (RuntimeException exception) {
            LOGGER.warn("CheapShark stores unavailable; using fallback store labels");
            return Map.of();
        }
    }

    private List<Deal> localFallback(RuntimeException exception) {
        LOGGER.warn(
                "CheapShark deals unavailable; serving the local deals fallback ({})",
                exception.getMessage()
        );
        return localDeals.getDeals();
    }

    private static String normalizeTitle(String title) {
        if (title == null) return null;
        String normalized = title.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
