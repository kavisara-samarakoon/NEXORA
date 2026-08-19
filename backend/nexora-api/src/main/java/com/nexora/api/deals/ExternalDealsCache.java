package com.nexora.api.deals;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ExternalDealsCache {

    private final ExternalDealsProperties properties;
    private final Clock clock;
    private final ConcurrentHashMap<ExternalDealsCacheKey, ExternalDealsCacheEntry<List<CheapSharkDealResponse>>>
            deals = new ConcurrentHashMap<>();
    private volatile ExternalDealsCacheEntry<Map<String, String>> storeLookup;

    @Autowired
    public ExternalDealsCache(ExternalDealsProperties properties) {
        this(properties, Clock.systemUTC());
    }

    ExternalDealsCache(ExternalDealsProperties properties, Clock clock) {
        this.properties = properties;
        this.clock = clock;
    }

    ExternalDealsCacheEntry<List<CheapSharkDealResponse>> getDeals(ExternalDealsCacheKey key) {
        return deals.get(key);
    }

    void putDeals(ExternalDealsCacheKey key, List<CheapSharkDealResponse> responses) {
        Instant now = clock.instant();
        deals.put(key, new ExternalDealsCacheEntry<>(
                List.copyOf(responses),
                now.plus(properties.getCache().dealsTtl())
        ));
    }

    ExternalDealsCacheEntry<Map<String, String>> getStoreLookup() {
        return storeLookup;
    }

    synchronized void putStoreLookup(Map<String, String> lookup) {
        Instant now = clock.instant();
        storeLookup = new ExternalDealsCacheEntry<>(
                Map.copyOf(lookup),
                now.plus(properties.getCache().storesTtl())
        );
    }

    boolean isFresh(ExternalDealsCacheEntry<?> entry) {
        return entry != null && entry.isFresh(clock.instant());
    }

    public void clear() {
        deals.clear();
        storeLookup = null;
    }
}
