package com.nexora.api.deals;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Service
public class ExternalDealService {

    private static final Logger LOGGER = LoggerFactory.getLogger(ExternalDealService.class);

    private final CheapSharkDealClient cheapSharkDealClient;
    private final CheapSharkDealMapper cheapSharkDealMapper;
    private final CheapSharkStoreDirectory cheapSharkStoreDirectory;
    private final DealCatalogService localDeals;
    private final ExternalDealsProperties properties;
    private final ExternalDealsCache cache;

    public ExternalDealService(
            CheapSharkDealClient cheapSharkDealClient,
            CheapSharkDealMapper cheapSharkDealMapper,
            CheapSharkStoreDirectory cheapSharkStoreDirectory,
            DealCatalogService localDeals,
            ExternalDealsProperties properties,
            ExternalDealsCache cache) {
        this.cheapSharkDealClient = cheapSharkDealClient;
        this.cheapSharkDealMapper = cheapSharkDealMapper;
        this.cheapSharkStoreDirectory = cheapSharkStoreDirectory;
        this.localDeals = localDeals;
        this.properties = properties;
        this.cache = cache;
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
            List<CheapSharkDealResponse> responses = cheapSharkDealClient.getDeals(
                    effectivePageSize,
                    effectiveTitle,
                    upperPrice
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

        try {
            List<CheapSharkDealResponse> responses = cheapSharkDealClient.getDeals(
                    effectivePageSize,
                    effectiveTitle,
                    upperPrice
            );
            cache.putDeals(cacheKey, responses);
            return responses;
        } catch (RuntimeException exception) {
            if (cached != null) {
                LOGGER.warn("CheapShark deals refresh failed; serving stale cached deals");
                return cached.value();
            }
            throw exception;
        }
    }

    private Map<String, String> getStoreLookup() {
        ExternalDealsCacheEntry<Map<String, String>> cached = cache.getStoreLookup();
        if (cache.isFresh(cached)) {
            LOGGER.debug("Using cached CheapShark store lookup");
            return cached.value();
        }

        try {
            Map<String, String> lookup = cheapSharkStoreDirectory.toLookup(
                    cheapSharkDealClient.getStores()
            );
            cache.putStoreLookup(lookup);
            return lookup;
        } catch (RuntimeException exception) {
            if (cached != null) {
                LOGGER.warn("CheapShark stores refresh failed; serving stale cached store lookup");
                return cached.value();
            }
            LOGGER.warn("CheapShark stores unavailable; using fallback store labels");
            return Map.of();
        }
    }

    private Map<String, String> getStoreLookupWithoutCache() {
        try {
            return cheapSharkStoreDirectory.toLookup(cheapSharkDealClient.getStores());
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
