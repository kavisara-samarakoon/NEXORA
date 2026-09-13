package com.nexora.api.deals;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.startsWith;
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

    @Test
    void concurrentSameKeyMissesShareProviderLoads() throws Exception {
        int callerCount = 8;
        MutableClock clock = new MutableClock();
        ExternalDealsProperties properties = properties(60, 60);
        CheapSharkDealClient client = mock(CheapSharkDealClient.class);
        DealCatalogService localDeals = mock(DealCatalogService.class);
        ExternalDealService service = service(client, localDeals, properties, clock);
        CountDownLatch callersReady = new CountDownLatch(callerCount);
        CountDownLatch startCallers = new CountDownLatch(1);
        CountDownLatch providerStarted = new CountDownLatch(1);
        CountDownLatch releaseProvider = new CountDownLatch(1);

        when(client.getDeals(12, "shared", null)).thenAnswer(invocation -> {
            providerStarted.countDown();
            assertTrue(releaseProvider.await(5, TimeUnit.SECONDS));
            return List.of(response("Shared result", "1"));
        });
        when(client.getStores()).thenReturn(List.of(store("1", "Steam")));

        ExecutorService executor = Executors.newFixedThreadPool(callerCount);
        try {
            List<Future<List<Deal>>> results = new ArrayList<>();
            for (int caller = 0; caller < callerCount; caller++) {
                results.add(executor.submit(() -> {
                    callersReady.countDown();
                    assertTrue(startCallers.await(5, TimeUnit.SECONDS));
                    return service.getDeals("shared", null, null);
                }));
            }

            assertTrue(callersReady.await(5, TimeUnit.SECONDS));
            startCallers.countDown();
            assertTrue(providerStarted.await(5, TimeUnit.SECONDS));
            releaseProvider.countDown();

            for (Future<List<Deal>> result : results) {
                assertEquals("Shared result", result.get(5, TimeUnit.SECONDS).get(0).title());
            }
        } finally {
            releaseProvider.countDown();
            executor.shutdownNow();
        }

        verify(client, times(1)).getDeals(12, "shared", null);
        verify(client, times(1)).getStores();
        verify(localDeals, never()).getDeals();
    }

    @Test
    void concurrentUniqueKeyMissesCannotExceedProviderBudget() throws Exception {
        int providerLimit = ExternalProviderRequestBudget.MAX_CONCURRENT_PROVIDER_CALLS;
        int callerCount = providerLimit + 4;
        MutableClock clock = new MutableClock();
        ExternalDealsProperties properties = properties(60, 60);
        CheapSharkDealClient client = mock(CheapSharkDealClient.class);
        DealCatalogService localDeals = mock(DealCatalogService.class);
        ExternalDealService service = service(
                client,
                localDeals,
                properties,
                clock,
                providerLimit
        );
        List<Deal> fallback = List.of(localDeal());
        CountDownLatch callersReady = new CountDownLatch(callerCount);
        CountDownLatch startCallers = new CountDownLatch(1);
        CountDownLatch providerCallsStarted = new CountDownLatch(providerLimit);
        CountDownLatch fallbackCallsCompleted = new CountDownLatch(callerCount - providerLimit);
        CountDownLatch releaseProvider = new CountDownLatch(1);
        AtomicInteger activeProviderCalls = new AtomicInteger();
        AtomicInteger maximumActiveProviderCalls = new AtomicInteger();
        AtomicInteger providerCallCount = new AtomicInteger();

        when(client.getDeals(eq(12), startsWith("unique-"), isNull())).thenAnswer(invocation -> {
            int active = activeProviderCalls.incrementAndGet();
            maximumActiveProviderCalls.accumulateAndGet(active, Math::max);
            providerCallCount.incrementAndGet();
            providerCallsStarted.countDown();
            try {
                assertTrue(releaseProvider.await(5, TimeUnit.SECONDS));
                String requestedTitle = invocation.getArgument(1);
                return List.of(response("Provider " + requestedTitle, "1"));
            } finally {
                activeProviderCalls.decrementAndGet();
            }
        });
        when(client.getStores()).thenReturn(List.of(store("1", "Steam")));
        when(localDeals.getDeals()).thenAnswer(invocation -> {
            fallbackCallsCompleted.countDown();
            return fallback;
        });

        ExecutorService executor = Executors.newFixedThreadPool(callerCount);
        try {
            List<Future<List<Deal>>> results = new ArrayList<>();
            for (int caller = 0; caller < callerCount; caller++) {
                int requestNumber = caller;
                results.add(executor.submit(() -> {
                    callersReady.countDown();
                    assertTrue(startCallers.await(5, TimeUnit.SECONDS));
                    return service.getDeals("unique-" + requestNumber, null, null);
                }));
            }

            assertTrue(callersReady.await(5, TimeUnit.SECONDS));
            startCallers.countDown();
            assertTrue(providerCallsStarted.await(5, TimeUnit.SECONDS));
            assertTrue(fallbackCallsCompleted.await(5, TimeUnit.SECONDS));
            releaseProvider.countDown();

            for (Future<List<Deal>> result : results) {
                assertEquals(1, result.get(5, TimeUnit.SECONDS).size());
            }
        } finally {
            releaseProvider.countDown();
            executor.shutdownNow();
        }

        assertAll(
                () -> assertEquals(providerLimit, providerCallCount.get()),
                () -> assertEquals(providerLimit, maximumActiveProviderCalls.get())
        );
        verify(client, times(providerLimit)).getDeals(eq(12), startsWith("unique-"), isNull());
        verify(localDeals, times(callerCount - providerLimit)).getDeals();
    }

    @Test
    void completedProviderCallReleasesPermitForNextUniqueKey() {
        MutableClock clock = new MutableClock();
        ExternalDealsProperties properties = properties(60, 60);
        CheapSharkDealClient client = mock(CheapSharkDealClient.class);
        DealCatalogService localDeals = mock(DealCatalogService.class);
        ExternalDealService service = service(client, localDeals, properties, clock, 1);

        when(client.getDeals(12, "first", null))
                .thenReturn(List.of(response("First provider result", "1")));
        when(client.getDeals(12, "second", null))
                .thenReturn(List.of(response("Second provider result", "1")));
        when(client.getStores()).thenReturn(List.of(store("1", "Steam")));

        assertEquals("First provider result", service.getDeals("first", null, null).get(0).title());
        assertEquals("Second provider result", service.getDeals("second", null, null).get(0).title());

        verify(client).getDeals(12, "first", null);
        verify(client).getDeals(12, "second", null);
        verify(localDeals, never()).getDeals();
    }

    @Test
    void failedProviderCallReleasesPermitForNextUniqueKey() {
        MutableClock clock = new MutableClock();
        ExternalDealsProperties properties = properties(60, 60);
        CheapSharkDealClient client = mock(CheapSharkDealClient.class);
        DealCatalogService localDeals = mock(DealCatalogService.class);
        List<Deal> fallback = List.of(localDeal());
        ExternalDealService service = service(client, localDeals, properties, clock, 1);

        when(client.getDeals(12, "failed", null))
                .thenThrow(new CheapSharkClientException("provider unavailable"));
        when(client.getDeals(12, "recovered", null))
                .thenReturn(List.of(response("Recovered provider result", "1")));
        when(client.getStores()).thenReturn(List.of(store("1", "Steam")));
        when(localDeals.getDeals()).thenReturn(fallback);

        assertEquals(fallback, service.getDeals("failed", null, null));
        assertEquals(
                "Recovered provider result",
                service.getDeals("recovered", null, null).get(0).title()
        );

        verify(client).getDeals(12, "failed", null);
        verify(client).getDeals(12, "recovered", null);
        verify(localDeals).getDeals();
    }

    @Test
    void interruptedProviderCallReleasesPermitForNextUniqueKey() {
        MutableClock clock = new MutableClock();
        ExternalDealsProperties properties = properties(60, 60);
        CheapSharkDealClient client = mock(CheapSharkDealClient.class);
        DealCatalogService localDeals = mock(DealCatalogService.class);
        List<Deal> fallback = List.of(localDeal());
        ExternalDealService service = service(client, localDeals, properties, clock, 1);

        when(client.getDeals(12, "interrupted", null)).thenAnswer(invocation -> {
            Thread.currentThread().interrupt();
            throw new CheapSharkClientException("provider request was interrupted");
        });
        when(client.getDeals(12, "after-interruption", null))
                .thenReturn(List.of(response("Post-interruption provider result", "1")));
        when(client.getStores()).thenReturn(List.of(store("1", "Steam")));
        when(localDeals.getDeals()).thenReturn(fallback);

        try {
            assertEquals(fallback, service.getDeals("interrupted", null, null));
            assertTrue(Thread.currentThread().isInterrupted());
        } finally {
            Thread.interrupted();
        }
        assertEquals(
                "Post-interruption provider result",
                service.getDeals("after-interruption", null, null).get(0).title()
        );

        verify(client).getDeals(12, "interrupted", null);
        verify(client).getDeals(12, "after-interruption", null);
        verify(localDeals).getDeals();
    }

    @Test
    void saturatedBudgetPrefersStaleDealsForTheSameKey() throws Exception {
        MutableClock clock = new MutableClock();
        ExternalDealsProperties properties = properties(5, 60);
        CheapSharkDealClient client = mock(CheapSharkDealClient.class);
        DealCatalogService localDeals = mock(DealCatalogService.class);
        ExternalDealService service = service(client, localDeals, properties, clock, 1);
        CountDownLatch blockingProviderStarted = new CountDownLatch(1);
        CountDownLatch releaseBlockingProvider = new CountDownLatch(1);

        when(client.getDeals(12, "stale", null))
                .thenReturn(List.of(response("Stale provider result", "1")));
        when(client.getDeals(12, "blocking", null)).thenAnswer(invocation -> {
            blockingProviderStarted.countDown();
            assertTrue(releaseBlockingProvider.await(5, TimeUnit.SECONDS));
            return List.of(response("Blocking provider result", "1"));
        });
        when(client.getStores()).thenReturn(List.of(store("1", "Steam")));

        assertEquals(
                "Stale provider result",
                service.getDeals("stale", null, null).get(0).title()
        );
        clock.advance(Duration.ofSeconds(6));

        ExecutorService executor = Executors.newSingleThreadExecutor();
        try {
            Future<List<Deal>> blockingResult = executor.submit(
                    () -> service.getDeals("blocking", null, null)
            );
            assertTrue(blockingProviderStarted.await(5, TimeUnit.SECONDS));

            List<Deal> saturatedResult = service.getDeals("stale", null, null);
            assertEquals("Stale provider result", saturatedResult.get(0).title());

            releaseBlockingProvider.countDown();
            assertEquals(
                    "Blocking provider result",
                    blockingResult.get(5, TimeUnit.SECONDS).get(0).title()
            );
        } finally {
            releaseBlockingProvider.countDown();
            executor.shutdownNow();
        }

        verify(client, times(1)).getDeals(12, "stale", null);
        verify(client, times(1)).getDeals(12, "blocking", null);
        verify(localDeals, never()).getDeals();
    }

    @Test
    void saturatedBudgetUsesLocalFallbackWithoutStaleDeals() throws Exception {
        MutableClock clock = new MutableClock();
        ExternalDealsProperties properties = properties(60, 60);
        CheapSharkDealClient client = mock(CheapSharkDealClient.class);
        DealCatalogService localDeals = mock(DealCatalogService.class);
        List<Deal> fallback = List.of(localDeal());
        ExternalDealService service = service(client, localDeals, properties, clock, 1);
        CountDownLatch blockingProviderStarted = new CountDownLatch(1);
        CountDownLatch releaseBlockingProvider = new CountDownLatch(1);

        when(client.getDeals(12, "blocking", null)).thenAnswer(invocation -> {
            blockingProviderStarted.countDown();
            assertTrue(releaseBlockingProvider.await(5, TimeUnit.SECONDS));
            return List.of(response("Blocking provider result", "1"));
        });
        when(client.getStores()).thenReturn(List.of(store("1", "Steam")));
        when(localDeals.getDeals()).thenReturn(fallback);

        ExecutorService executor = Executors.newSingleThreadExecutor();
        try {
            Future<List<Deal>> blockingResult = executor.submit(
                    () -> service.getDeals("blocking", null, null)
            );
            assertTrue(blockingProviderStarted.await(5, TimeUnit.SECONDS));

            assertEquals(fallback, service.getDeals("overflow", null, null));

            releaseBlockingProvider.countDown();
            assertEquals(
                    "Blocking provider result",
                    blockingResult.get(5, TimeUnit.SECONDS).get(0).title()
            );
        } finally {
            releaseBlockingProvider.countDown();
            executor.shutdownNow();
        }

        verify(client, never()).getDeals(12, "overflow", null);
        verify(localDeals).getDeals();
    }

    @Test
    void failedSingleFlightIsRemovedSoLaterRequestCanRetry() {
        MutableClock clock = new MutableClock();
        ExternalDealsProperties properties = properties(60, 60);
        CheapSharkDealClient client = mock(CheapSharkDealClient.class);
        DealCatalogService localDeals = mock(DealCatalogService.class);
        List<Deal> fallback = List.of(localDeal());
        ExternalDealService service = service(client, localDeals, properties, clock);

        when(client.getDeals(12, "retry", null))
                .thenThrow(new CheapSharkClientException("provider unavailable"))
                .thenReturn(List.of(response("Recovered result", "1")));
        when(client.getStores()).thenReturn(List.of(store("1", "Steam")));
        when(localDeals.getDeals()).thenReturn(fallback);

        assertEquals(fallback, service.getDeals("retry", null, null));
        assertEquals("Recovered result", service.getDeals("retry", null, null).get(0).title());

        verify(client, times(2)).getDeals(12, "retry", null);
        verify(client, times(1)).getStores();
        verify(localDeals, times(1)).getDeals();
    }

    private static ExternalDealService service(
            CheapSharkDealClient client,
            DealCatalogService localDeals,
            ExternalDealsProperties properties,
            Clock clock) {
        return service(
                client,
                localDeals,
                properties,
                clock,
                ExternalProviderRequestBudget.MAX_CONCURRENT_PROVIDER_CALLS
        );
    }

    private static ExternalDealService service(
            CheapSharkDealClient client,
            DealCatalogService localDeals,
            ExternalDealsProperties properties,
            Clock clock,
            int maxConcurrentProviderCalls) {
        CheapSharkStoreDirectory storeDirectory = new CheapSharkStoreDirectory();
        return new ExternalDealService(
                client,
                new CheapSharkDealMapper(storeDirectory),
                storeDirectory,
                localDeals,
                properties,
                new ExternalDealsCache(properties, clock),
                new ExternalProviderRequestBudget(maxConcurrentProviderCalls)
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
                "Current offer",
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
