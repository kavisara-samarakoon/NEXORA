package com.nexora.api.deals;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ExternalDealServiceCacheTests {

    @Test
    void expiredDealsCacheRefreshesFromProvider() {
        MutableClock clock = new MutableClock();
        ExternalDealsProperties properties = properties(5, 60);
        CheapSharkDealClient client = mock(CheapSharkDealClient.class);
        DealCatalogService localDeals = mock(DealCatalogService.class);
        ExternalDealService service = service(client, localDeals, properties, clock);

        when(client.getDeals(12, null, null))
                .thenReturn(List.of(response("First result", "1")))
                .thenReturn(List.of(response("Refreshed result", "1")));
        when(client.getStores()).thenReturn(List.of(store("1", "Steam")));

        assertEquals("First result", service.getDeals(null, null, null).get(0).title());
        clock.advance(Duration.ofSeconds(6));
        assertEquals("Refreshed result", service.getDeals(null, null, null).get(0).title());

        verify(client, times(2)).getDeals(12, null, null);
        verify(client, times(1)).getStores();
        verify(localDeals, never()).getDeals();
    }

    @Test
    void failedDealsRefreshServesStaleExternalDeals() {
        MutableClock clock = new MutableClock();
        ExternalDealsProperties properties = properties(5, 60);
        CheapSharkDealClient client = mock(CheapSharkDealClient.class);
        DealCatalogService localDeals = mock(DealCatalogService.class);
        ExternalDealService service = service(client, localDeals, properties, clock);

        when(client.getDeals(12, null, null))
                .thenReturn(List.of(response("Cached result", "1")))
                .thenThrow(new CheapSharkClientException("provider unavailable"));
        when(client.getStores()).thenReturn(List.of(store("1", "Steam")));

        service.getDeals(null, null, null);
        clock.advance(Duration.ofSeconds(6));
        List<Deal> staleDeals = service.getDeals(null, null, null);

        assertAll(
                () -> assertEquals(1, staleDeals.size()),
                () -> assertEquals("Cached result", staleDeals.get(0).title()),
                () -> assertEquals("Steam", staleDeals.get(0).store())
        );
        verify(client, times(2)).getDeals(12, null, null);
        verify(localDeals, never()).getDeals();
    }

    @Test
    void failedDealsRequestWithoutCachedDataUsesLocalFallback() {
        MutableClock clock = new MutableClock();
        ExternalDealsProperties properties = properties(5, 60);
        CheapSharkDealClient client = mock(CheapSharkDealClient.class);
        DealCatalogService localDeals = mock(DealCatalogService.class);
        List<Deal> fallback = List.of(localDeal());
        when(localDeals.getDeals()).thenReturn(fallback);
        when(client.getDeals(12, null, null))
                .thenThrow(new CheapSharkClientException("provider unavailable"));

        assertEquals(fallback, service(client, localDeals, properties, clock)
                .getDeals(null, null, null));

        verify(client, never()).getStores();
        verify(localDeals).getDeals();
    }

    @Test
    void failedStoreRefreshServesStaleStoreNames() {
        MutableClock clock = new MutableClock();
        ExternalDealsProperties properties = properties(60, 5);
        CheapSharkDealClient client = mock(CheapSharkDealClient.class);
        DealCatalogService localDeals = mock(DealCatalogService.class);
        ExternalDealService service = service(client, localDeals, properties, clock);

        when(client.getDeals(12, null, null)).thenReturn(List.of(response("Cached deal", "27")));
        when(client.getStores())
                .thenReturn(List.of(store("27", "Fanatical")))
                .thenThrow(new CheapSharkClientException("stores unavailable"));

        service.getDeals(null, null, null);
        clock.advance(Duration.ofSeconds(6));
        List<Deal> deals = service.getDeals(null, null, null);

        assertEquals("Fanatical", deals.get(0).store());
        verify(client, times(1)).getDeals(12, null, null);
        verify(client, times(2)).getStores();
        verify(localDeals, never()).getDeals();
    }

    @Test
    void cacheDisabledCallsDealsAndStoresForEveryRequest() {
        MutableClock clock = new MutableClock();
        ExternalDealsProperties properties = properties(60, 60);
        properties.getCache().setEnabled(false);
        CheapSharkDealClient client = mock(CheapSharkDealClient.class);
        DealCatalogService localDeals = mock(DealCatalogService.class);
        ExternalDealService service = service(client, localDeals, properties, clock);

        when(client.getDeals(12, null, null)).thenReturn(List.of(response("Live result", "1")));
        when(client.getStores()).thenReturn(List.of(store("1", "Steam")));

        service.getDeals(null, null, null);
        service.getDeals(null, null, null);

        verify(client, times(2)).getDeals(12, null, null);
        verify(client, times(2)).getStores();
        verify(localDeals, never()).getDeals();
    }

    @Test
    void ttlConfigurationIsClampedToAtLeastOneSecond() {
        ExternalDealsProperties.Cache cache = new ExternalDealsProperties.Cache();

        cache.setDealsTtlSeconds(0);
        cache.setStoresTtlSeconds(-10);

        assertAll(
                () -> assertEquals(1, cache.getDealsTtlSeconds()),
                () -> assertEquals(1, cache.getStoresTtlSeconds()),
                () -> assertEquals(Duration.ofSeconds(1), cache.dealsTtl()),
                () -> assertEquals(Duration.ofSeconds(1), cache.storesTtl())
        );
    }

    private static ExternalDealService service(
            CheapSharkDealClient client,
            DealCatalogService localDeals,
            ExternalDealsProperties properties,
            Clock clock) {
        CheapSharkStoreDirectory storeDirectory = new CheapSharkStoreDirectory();
        return new ExternalDealService(
                client,
                new CheapSharkDealMapper(storeDirectory),
                storeDirectory,
                localDeals,
                properties,
                new ExternalDealsCache(properties, clock)
        );
    }

    private static ExternalDealsProperties properties(int dealsTtlSeconds, int storesTtlSeconds) {
        ExternalDealsProperties properties = new ExternalDealsProperties();
        properties.getCache().setDealsTtlSeconds(dealsTtlSeconds);
        properties.getCache().setStoresTtlSeconds(storesTtlSeconds);
        return properties;
    }

    private static CheapSharkDealResponse response(String title, String storeId) {
        return new CheapSharkDealResponse(
                title,
                storeId,
                "4.99",
                "19.99",
                "75",
                "90",
                "9",
                title
        );
    }

    private static CheapSharkStoreResponse store(String storeId, String storeName) {
        return new CheapSharkStoreResponse(storeId, storeName, 1);
    }

    private static Deal localDeal() {
        return new Deal(
                99,
                "Local Store",
                "-50%",
                50,
                "Local fallback",
                "$20.00",
                "$10.00",
                new BigDecimal("10.00"),
                new BigDecimal("4.0"),
                "★★★★☆",
                "Local",
                "Good Price",
                null
        );
    }

    private static final class MutableClock extends Clock {

        private Instant instant = Instant.parse("2026-08-20T00:00:00Z");

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
