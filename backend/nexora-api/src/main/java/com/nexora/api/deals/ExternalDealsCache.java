package com.nexora.api.deals;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class ExternalDealsCache {

    static final int MAX_DEALS_ENTRIES = 128;

    private final ExternalDealsProperties properties;
    private final Clock clock;
    private final int maxDealsEntries;
    private final LinkedHashMap<ExternalDealsCacheKey, ExternalDealsCacheEntry<List<CheapSharkDealResponse>>>
            deals = new LinkedHashMap<>(16, 0.75f, true);
    private volatile ExternalDealsCacheEntry<Map<String, String>> storeLookup;

    @Autowired
    public ExternalDealsCache(ExternalDealsProperties properties) {
        this(properties, Clock.systemUTC());
    }

    ExternalDealsCache(ExternalDealsProperties properties, Clock clock) {
        this(properties, clock, MAX_DEALS_ENTRIES);
    }

    ExternalDealsCache(ExternalDealsProperties properties, Clock clock, int maxDealsEntries) {
        this.properties = properties;
        this.clock = clock;
        this.maxDealsEntries = Math.max(1, maxDealsEntries);
    }

    synchronized ExternalDealsCacheEntry<List<CheapSharkDealResponse>> getDeals(
            ExternalDealsCacheKey key) {
        ExternalDealsCacheEntry<List<CheapSharkDealResponse>> entry = deals.get(key);
        if (entry != null && !entry.isFresh(clock.instant())) {
            deals.remove(key);
        }
        return entry;
    }

    synchronized void putDeals(
            ExternalDealsCacheKey key,
            List<CheapSharkDealResponse> responses) {
        Instant now = clock.instant();
        removeExpiredDeals(now);
        if (!deals.containsKey(key)) {
            evictDealsAtCapacity();
        }
        deals.put(key, new ExternalDealsCacheEntry<>(
                List.copyOf(responses),
                now.plus(properties.getCache().dealsTtl())
        ));
    }

    synchronized ExternalDealsCacheEntry<Map<String, String>> getStoreLookup() {
        ExternalDealsCacheEntry<Map<String, String>> entry = storeLookup;
        if (entry != null && !entry.isFresh(clock.instant())) {
            storeLookup = null;
        }
        return entry;
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

    synchronized int dealEntryCount() {
        return deals.size();
    }

    public synchronized void clear() {
        deals.clear();
        storeLookup = null;
    }

    private void removeExpiredDeals(Instant now) {
        deals.entrySet().removeIf(entry -> !entry.getValue().isFresh(now));
    }

    private void evictDealsAtCapacity() {
        while (deals.size() >= maxDealsEntries) {
            Iterator<ExternalDealsCacheKey> iterator = deals.keySet().iterator();
            if (!iterator.hasNext()) {
                return;
            }
            iterator.next();
            iterator.remove();
        }
    }
}
