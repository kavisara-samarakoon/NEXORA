package com.nexora.api.deals;

import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ExternalDealsCacheTests {

    @Test
    void freshDealEntryIsReturned() {
        MutableClock clock = new MutableClock();
        ExternalDealsCache cache = cache(clock, 2, 60);
        ExternalDealsCacheKey key = key("fresh");

        cache.putDeals(key, List.of(response("Fresh result")));

        ExternalDealsCacheEntry<List<CheapSharkDealResponse>> entry = cache.getDeals(key);
        assertNotNull(entry);
        assertTrue(cache.isFresh(entry));
        assertEquals("Fresh result", entry.value().get(0).title());
        assertEquals(1, cache.dealEntryCount());
    }

    @Test
    void expiredDealEntryIsRemovedWhenDiscovered() {
        MutableClock clock = new MutableClock();
        ExternalDealsCache cache = cache(clock, 2, 5);
        ExternalDealsCacheKey key = key("expired");
        cache.putDeals(key, List.of(response("Expired result")));

        clock.advance(Duration.ofSeconds(6));
        ExternalDealsCacheEntry<List<CheapSharkDealResponse>> expired = cache.getDeals(key);

        assertNotNull(expired);
        assertFalse(cache.isFresh(expired));
        assertEquals(0, cache.dealEntryCount());
        assertNull(cache.getDeals(key));
    }

    @Test
    void insertionRemovesExpiredEntriesBeforeApplyingCapacity() {
        MutableClock clock = new MutableClock();
        ExternalDealsCache cache = cache(clock, 2, 5);
        cache.putDeals(key("first"), List.of(response("First result")));
        cache.putDeals(key("second"), List.of(response("Second result")));

        clock.advance(Duration.ofSeconds(6));
        cache.putDeals(key("third"), List.of(response("Third result")));

        assertEquals(1, cache.dealEntryCount());
        assertNotNull(cache.getDeals(key("third")));
    }

    @Test
    void capacityEvictsLeastRecentlyUsedEntryDeterministically() {
        MutableClock clock = new MutableClock();
        ExternalDealsCache cache = cache(clock, 2, 60);
        ExternalDealsCacheKey first = key("first");
        ExternalDealsCacheKey second = key("second");
        ExternalDealsCacheKey third = key("third");
        cache.putDeals(first, List.of(response("First result")));
        cache.putDeals(second, List.of(response("Second result")));

        assertNotNull(cache.getDeals(first));
        cache.putDeals(third, List.of(response("Third result")));

        assertEquals(2, cache.dealEntryCount());
        assertNotNull(cache.getDeals(first));
        assertNull(cache.getDeals(second));
        assertNotNull(cache.getDeals(third));
    }

    private static ExternalDealsCache cache(MutableClock clock, int maxEntries, int ttlSeconds) {
        ExternalDealsProperties properties = new ExternalDealsProperties();
        properties.getCache().setDealsTtlSeconds(ttlSeconds);
        return new ExternalDealsCache(properties, clock, maxEntries);
    }

    private static ExternalDealsCacheKey key(String title) {
        return ExternalDealsCacheKey.of(12, title, null);
    }

    private static CheapSharkDealResponse response(String title) {
        return new CheapSharkDealResponse(
                title,
                "1",
                "4.99",
                "19.99",
                "75",
                "90",
                "9",
                title
        );
    }

    private static final class MutableClock extends Clock {

        private Instant instant = Instant.parse("2026-09-05T00:00:00Z");

        void advance(Duration duration) {
            instant = instant.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }
}
