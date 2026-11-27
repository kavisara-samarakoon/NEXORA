package com.nexora.api.deals;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;

@Service
public class ExternalDealService {

    private static final Logger LOGGER = LoggerFactory.getLogger(ExternalDealService.class);
    private static final String CHEAPSHARK_ATTRIBUTION = "CheapShark";
    private static final String CHEAPSHARK_URL = "https://www.cheapshark.com";

    private final CheapSharkDealClient cheapSharkDealClient;
    private final CheapSharkDealMapper cheapSharkDealMapper;
    private final CheapSharkStoreDirectory cheapSharkStoreDirectory;
    private final DealCatalogService localDeals;
    private final ExternalDealsProperties properties;
    private final ExternalDealsCache cache;
    private final ExternalProviderRequestBudget providerRequestBudget;
    private final ConcurrentHashMap<ExternalDealsCacheKey, CompletableFuture<DealLoadResult>>
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
        return getDeals(title, pageSize, upperPrice, null, null, null, null);
    }

    public List<Deal> getDeals(
            String title,
            Integer pageSize,
            BigDecimal upperPrice,
            String sortBy,
            Boolean desc,
            String storeId,
            Integer pageNumber) {
        if (!properties.isEnabled()) {
            return localDeals.getDeals();
        }

        int effectivePageSize = normalizePageSize(pageSize);
        String effectiveTitle = normalizeTitle(title);
        String effectiveSortBy = CheapSharkDealClient.normalizeSortBy(sortBy);
        boolean effectiveDesc = desc == null || desc;
        String effectiveStoreId = normalizeStoreId(storeId);
        int effectivePageNumber = normalizePageNumber(pageNumber);

        if (!properties.getCache().isEnabled()) {
            return getDealsWithoutCache(
                    effectivePageSize,
                    effectiveTitle,
                    upperPrice,
                    effectiveSortBy,
                    effectiveDesc,
                    effectiveStoreId,
                    effectivePageNumber);
        }

        ExternalDealsCacheKey cacheKey = ExternalDealsCacheKey.of(
                effectivePageSize,
                effectiveTitle,
                upperPrice,
                effectiveSortBy,
                effectiveDesc,
                effectiveStoreId,
                effectivePageNumber
        );

        try {
            DealLoadResult loadResult = getDealResponses(
                    cacheKey,
                    effectivePageSize,
                    effectiveTitle,
                    upperPrice,
                    effectiveSortBy,
                    effectiveDesc,
                    effectiveStoreId,
                    effectivePageNumber
            );
            Map<String, String> storeLookup = getStoreLookup();
            return cheapSharkDealMapper.toDeals(
                    loadResult.responses(), storeLookup, loadResult.refreshedAtUtc());
        } catch (RuntimeException exception) {
            return localFallback(exception);
        }
    }

    public ExternalDealsCatalogResponse getLiveCatalog(
            String title,
            Integer pageSize,
            BigDecimal upperPrice,
            String sortBy,
            Boolean desc,
            String storeId,
            Integer pageNumber) {
        if (!properties.isEnabled()) {
            return new ExternalDealsCatalogResponse(
                    List.of(),
                    "unavailable",
                    CHEAPSHARK_ATTRIBUTION,
                    CHEAPSHARK_URL,
                    "USD",
                    "unavailable",
                    null,
                    List.of(),
                    "External live deals provider is disabled in configuration."
            );
        }

        int effectivePageSize = normalizePageSize(pageSize);
        String effectiveTitle = normalizeTitle(title);
        String effectiveSortBy = CheapSharkDealClient.normalizeSortBy(sortBy);
        boolean effectiveDesc = desc == null || desc;
        String effectiveStoreId = normalizeStoreId(storeId);
        int effectivePageNumber = normalizePageNumber(pageNumber);

        try {
            DealLoadResult loadResult;
            Map<String, String> storeLookup;
            if (!properties.getCache().isEnabled()) {
                List<CheapSharkDealResponse> responses = fetchDealsFromClient(
                        effectivePageSize,
                        effectiveTitle,
                        upperPrice,
                        effectiveSortBy,
                        effectiveDesc,
                        effectiveStoreId,
                        effectivePageNumber
                );
                loadResult = new DealLoadResult(responses, "live", cache.now());
                storeLookup = getStoreLookupWithoutCache();
            } else {
                ExternalDealsCacheKey cacheKey = ExternalDealsCacheKey.of(
                        effectivePageSize,
                        effectiveTitle,
                        upperPrice,
                        effectiveSortBy,
                        effectiveDesc,
                        effectiveStoreId,
                        effectivePageNumber
                );
                loadResult = getDealResponses(
                        cacheKey,
                        effectivePageSize,
                        effectiveTitle,
                        upperPrice,
                        effectiveSortBy,
                        effectiveDesc,
                        effectiveStoreId,
                        effectivePageNumber
                );
                storeLookup = getStoreLookup();
            }

            List<Deal> mappedDeals = cheapSharkDealMapper.toDeals(
                    loadResult.responses(),
                    storeLookup,
                    loadResult.refreshedAtUtc()
            );
            List<DealStoreOption> stores = cheapSharkStoreDirectory.toActiveStoreOptions(storeLookup);
            String notice = "stale".equals(loadResult.cacheState())
                    ? "Live refresh failed; serving the last cached CheapShark snapshot."
                    : null;
            return new ExternalDealsCatalogResponse(
                    mappedDeals,
                    "cheapshark",
                    CHEAPSHARK_ATTRIBUTION,
                    CHEAPSHARK_URL,
                    "USD",
                    loadResult.cacheState(),
                    loadResult.refreshedAtUtc(),
                    stores,
                    notice
            );
        } catch (RuntimeException exception) {
            LOGGER.warn(
                    "CheapShark live deals unavailable ({})",
                    exception.getMessage()
            );
            return new ExternalDealsCatalogResponse(
                    List.of(),
                    "unavailable",
                    CHEAPSHARK_ATTRIBUTION,
                    CHEAPSHARK_URL,
                    "USD",
                    "unavailable",
                    null,
                    List.of(),
                    "Live deals could not be retrieved from CheapShark right now. Curated sample entries remain separate."
            );
        }
    }

    private List<Deal> getDealsWithoutCache(
            int effectivePageSize,
            String effectiveTitle,
            BigDecimal upperPrice,
            String effectiveSortBy,
            boolean effectiveDesc,
            String effectiveStoreId,
            int effectivePageNumber) {
        try {
            List<CheapSharkDealResponse> responses = fetchDealsFromClient(
                    effectivePageSize,
                    effectiveTitle,
                    upperPrice,
                    effectiveSortBy,
                    effectiveDesc,
                    effectiveStoreId,
                    effectivePageNumber
            );
            Map<String, String> storeLookup = getStoreLookupWithoutCache();
            return cheapSharkDealMapper.toDeals(responses, storeLookup, cache.now());
        } catch (RuntimeException exception) {
            return localFallback(exception);
        }
    }

    private List<CheapSharkDealResponse> fetchDealsFromClient(
            int effectivePageSize,
            String effectiveTitle,
            BigDecimal upperPrice,
            String effectiveSortBy,
            boolean effectiveDesc,
            String effectiveStoreId,
            int effectivePageNumber) {
        boolean defaultQuery = "DealRating".equals(effectiveSortBy)
                && effectiveDesc
                && effectiveStoreId == null
                && effectivePageNumber == 0;
        if (defaultQuery) {
            return providerRequestBudget.execute(
                    () -> cheapSharkDealClient.getDeals(
                            effectivePageSize,
                            effectiveTitle,
                            upperPrice
                    )
            );
        }
        return providerRequestBudget.execute(
                () -> cheapSharkDealClient.getDeals(
                        effectivePageSize,
                        effectiveTitle,
                        upperPrice,
                        effectiveSortBy,
                        effectiveDesc,
                        effectiveStoreId,
                        effectivePageNumber
                )
        );
    }

    private DealLoadResult getDealResponses(
            ExternalDealsCacheKey cacheKey,
            int effectivePageSize,
            String effectiveTitle,
            BigDecimal upperPrice,
            String effectiveSortBy,
            boolean effectiveDesc,
            String effectiveStoreId,
            int effectivePageNumber) {
        ExternalDealsCacheEntry<List<CheapSharkDealResponse>> cached = cache.getDeals(cacheKey);
        if (cache.isFresh(cached)) {
            LOGGER.debug("Using cached CheapShark deals");
            return new DealLoadResult(cached.value(), "cached", cached.fetchedAt());
        }

        CompletableFuture<DealLoadResult> newLoad = new CompletableFuture<>();
        CompletableFuture<DealLoadResult> activeLoad = dealLoads.putIfAbsent(cacheKey, newLoad);
        if (activeLoad != null) {
            return await(activeLoad);
        }

        try {
            DealLoadResult responses = loadDealResponses(
                    cacheKey,
                    effectivePageSize,
                    effectiveTitle,
                    upperPrice,
                    effectiveSortBy,
                    effectiveDesc,
                    effectiveStoreId,
                    effectivePageNumber,
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

    private DealLoadResult loadDealResponses(
            ExternalDealsCacheKey cacheKey,
            int effectivePageSize,
            String effectiveTitle,
            BigDecimal upperPrice,
            String effectiveSortBy,
            boolean effectiveDesc,
            String effectiveStoreId,
            int effectivePageNumber,
            ExternalDealsCacheEntry<List<CheapSharkDealResponse>> initialCached) {
        ExternalDealsCacheEntry<List<CheapSharkDealResponse>> latestCached = cache.getDeals(cacheKey);
        if (cache.isFresh(latestCached)) {
            return new DealLoadResult(latestCached.value(), "cached", latestCached.fetchedAt());
        }
        ExternalDealsCacheEntry<List<CheapSharkDealResponse>> stale =
                initialCached != null ? initialCached : latestCached;

        try {
            List<CheapSharkDealResponse> responses = fetchDealsFromClient(
                    effectivePageSize,
                    effectiveTitle,
                    upperPrice,
                    effectiveSortBy,
                    effectiveDesc,
                    effectiveStoreId,
                    effectivePageNumber
            );
            cache.putDeals(cacheKey, responses);
            ExternalDealsCacheEntry<List<CheapSharkDealResponse>> stored = cache.getDeals(cacheKey);
            Instant refreshedAt = stored != null && stored.fetchedAt() != null
                    ? stored.fetchedAt()
                    : cache.now();
            return new DealLoadResult(responses, "live", refreshedAt);
        } catch (ExternalProviderRequestBudget.CapacityUnavailableException exception) {
            if (stale != null) {
                LOGGER.warn("CheapShark deals request budget saturated; serving stale cached deals");
                return new DealLoadResult(stale.value(), "stale", stale.fetchedAt());
            }
            throw exception;
        } catch (RuntimeException exception) {
            if (stale != null) {
                LOGGER.warn("CheapShark deals refresh failed; serving stale cached deals");
                return new DealLoadResult(stale.value(), "stale", stale.fetchedAt());
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

    private int normalizePageSize(Integer pageSize) {
        int requestedPageSize = pageSize == null ? properties.getDefaultPageSize() : pageSize;
        int maxPageSize = Math.max(1, properties.getMaxPageSize());
        return Math.max(1, Math.min(requestedPageSize, maxPageSize));
    }

    private static int normalizePageNumber(Integer pageNumber) {
        if (pageNumber == null) return 0;
        return Math.max(0, Math.min(pageNumber, 20));
    }

    private static String normalizeTitle(String title) {
        if (title == null) return null;
        String normalized = title.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private static String normalizeStoreId(String storeId) {
        if (storeId == null) return null;
        String normalized = storeId.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private record DealLoadResult(
            List<CheapSharkDealResponse> responses,
            String cacheState,
            Instant refreshedAtUtc
    ) {
    }
}
