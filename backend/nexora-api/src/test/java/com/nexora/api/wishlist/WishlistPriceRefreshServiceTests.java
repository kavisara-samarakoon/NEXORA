package com.nexora.api.wishlist;

import com.nexora.api.wishlist.persistence.WishlistItem;
import com.nexora.api.wishlist.persistence.WishlistItemRepository;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class WishlistPriceRefreshServiceTests {

    @Test
    void scansActiveAlertItemsWithoutRefreshingAnUnchangedPrice() {
        WishlistItemRepository repository = mock(WishlistItemRepository.class);
        WishlistPriceSnapshotProvider provider = mock(WishlistPriceSnapshotProvider.class);
        WishlistAlertEventRecorder recorder = mock(WishlistAlertEventRecorder.class);
        WishlistPriceHistoryService historyService = mock(WishlistPriceHistoryService.class);
        WishlistItem item = item(1L, 7L, true, true, "$30.00", "$20.00");
        when(repository.findActiveUserAlertItemsForRefresh()).thenReturn(List.of(item));
        when(provider.findCurrentPrice(item)).thenReturn(Optional.of("$30.00"));

        WishlistPriceRefreshSummary summary = service(repository, provider, recorder, historyService)
                .refreshActiveWishlistAlerts();

        assertEquals(new WishlistPriceRefreshSummary(1, 0, 0, 0), summary);
        verify(provider).findCurrentPrice(item);
        verify(repository, never()).save(item);
        verifyNoInteractions(recorder);
        verifyNoInteractions(historyService);
    }

    @Test
    void skipsEmptyAndBlankProviderPrices() {
        WishlistItemRepository repository = mock(WishlistItemRepository.class);
        WishlistPriceSnapshotProvider provider = mock(WishlistPriceSnapshotProvider.class);
        WishlistAlertEventRecorder recorder = mock(WishlistAlertEventRecorder.class);
        WishlistItem emptyItem = item(1L, 7L, true, true, "$30.00", "$20.00");
        WishlistItem blankItem = item(2L, 7L, true, true, "$40.00", "$20.00");
        when(repository.findActiveUserAlertItemsForRefresh())
                .thenReturn(List.of(emptyItem, blankItem));
        when(provider.findCurrentPrice(emptyItem)).thenReturn(Optional.empty());
        when(provider.findCurrentPrice(blankItem)).thenReturn(Optional.of("   "));

        WishlistPriceRefreshSummary summary = service(repository, provider, recorder)
                .refreshActiveWishlistAlerts();

        assertAll(
                () -> assertEquals(new WishlistPriceRefreshSummary(2, 0, 0, 2), summary),
                () -> assertEquals("$30.00", emptyItem.getCurrentPrice()),
                () -> assertEquals("$40.00", blankItem.getCurrentPrice())
        );
        verify(repository, never()).save(emptyItem);
        verify(repository, never()).save(blankItem);
        verifyNoInteractions(recorder);
    }

    @Test
    void updatesPriceAndRecordsTransitionToTargetReached() {
        WishlistItemRepository repository = mock(WishlistItemRepository.class);
        WishlistPriceSnapshotProvider provider = mock(WishlistPriceSnapshotProvider.class);
        WishlistAlertEventRecorder recorder = mock(WishlistAlertEventRecorder.class);
        WishlistPriceHistoryService historyService = mock(WishlistPriceHistoryService.class);
        WishlistItem item = item(1L, 7L, true, true, "$30.00", "$20.00");
        when(repository.findActiveUserAlertItemsForRefresh()).thenReturn(List.of(item));
        when(provider.findCurrentPrice(item)).thenReturn(Optional.of("  $20.00  "));
        when(provider.priceHistorySource()).thenReturn("cheapshark-provider");

        WishlistPriceRefreshSummary summary = service(repository, provider, recorder, historyService)
                .refreshActiveWishlistAlerts();

        assertAll(
                () -> assertEquals("$20.00", item.getCurrentPrice()),
                () -> assertEquals(new WishlistPriceRefreshSummary(1, 1, 1, 0), summary)
        );
        verify(repository).save(item);
        verify(historyService).recordSnapshot(7L, item, "cheapshark-provider");
        verify(recorder).recordTargetReachedEvent(
                7L,
                item,
                new WishlistAlertEvaluation(
                        true, "target-reached", "Target price reached."));
    }

    @Test
    void repeatedRunDoesNotRecordDuplicateTargetReachedEvent() {
        WishlistItemRepository repository = mock(WishlistItemRepository.class);
        WishlistPriceSnapshotProvider provider = mock(WishlistPriceSnapshotProvider.class);
        WishlistAlertEventRecorder recorder = mock(WishlistAlertEventRecorder.class);
        WishlistPriceHistoryService historyService = mock(WishlistPriceHistoryService.class);
        WishlistItem item = item(1L, 7L, true, true, "$30.00", "$20.00");
        when(repository.findActiveUserAlertItemsForRefresh()).thenReturn(List.of(item));
        when(provider.findCurrentPrice(item)).thenReturn(Optional.of("$19.99"));
        WishlistPriceRefreshService service = service(
                repository, provider, recorder, historyService);

        WishlistPriceRefreshSummary firstRun = service.refreshActiveWishlistAlerts();
        WishlistPriceRefreshSummary secondRun = service.refreshActiveWishlistAlerts();

        assertAll(
                () -> assertEquals(new WishlistPriceRefreshSummary(1, 1, 1, 0), firstRun),
                () -> assertEquals(new WishlistPriceRefreshSummary(1, 0, 0, 0), secondRun)
        );
        verify(repository, times(1)).save(item);
        verify(historyService, times(1)).recordSnapshot(7L, item, null);
        verify(recorder, times(1)).recordTargetReachedEvent(
                7L,
                item,
                new WishlistAlertEvaluation(
                        true, "target-reached", "Target price reached."));
    }

    @Test
    void changedPriceThatRemainsAboveTargetCreatesNoEvent() {
        WishlistItemRepository repository = mock(WishlistItemRepository.class);
        WishlistPriceSnapshotProvider provider = mock(WishlistPriceSnapshotProvider.class);
        WishlistAlertEventRecorder recorder = mock(WishlistAlertEventRecorder.class);
        WishlistPriceHistoryService historyService = mock(WishlistPriceHistoryService.class);
        WishlistItem item = item(1L, 7L, true, true, "$30.00", "$20.00");
        when(repository.findActiveUserAlertItemsForRefresh()).thenReturn(List.of(item));
        when(provider.findCurrentPrice(item)).thenReturn(Optional.of("$25.00"));

        WishlistPriceRefreshSummary summary = service(repository, provider, recorder, historyService)
                .refreshActiveWishlistAlerts();

        assertAll(
                () -> assertEquals("$25.00", item.getCurrentPrice()),
                () -> assertEquals(new WishlistPriceRefreshSummary(1, 1, 0, 0), summary),
                () -> assertEquals(
                        "watching",
                        WishlistAlertEvaluator.evaluate(
                                item.getCurrentPrice(), item.getTargetPrice(), true).state())
        );
        verify(repository).save(item);
        verify(historyService).recordSnapshot(7L, item, null);
        verifyNoInteractions(recorder);
    }

    @Test
    void providerFailureSkipsItemAndContinuesRefreshingRemainingItems() {
        WishlistItemRepository repository = mock(WishlistItemRepository.class);
        WishlistPriceSnapshotProvider provider = mock(WishlistPriceSnapshotProvider.class);
        WishlistAlertEventRecorder recorder = mock(WishlistAlertEventRecorder.class);
        WishlistItem failedItem = item(1L, 7L, true, true, "$30.00", "$20.00");
        WishlistItem nextItem = item(2L, 7L, true, true, "$40.00", "$20.00");
        when(repository.findActiveUserAlertItemsForRefresh())
                .thenReturn(List.of(failedItem, nextItem));
        when(provider.findCurrentPrice(failedItem))
                .thenThrow(new IllegalStateException("provider unavailable"));
        when(provider.findCurrentPrice(nextItem)).thenReturn(Optional.of("$25.00"));

        WishlistPriceRefreshSummary summary = service(repository, provider, recorder)
                .refreshActiveWishlistAlerts();

        assertAll(
                () -> assertEquals("$30.00", failedItem.getCurrentPrice()),
                () -> assertEquals("$25.00", nextItem.getCurrentPrice()),
                () -> assertEquals(new WishlistPriceRefreshSummary(2, 1, 0, 1), summary)
        );
        verify(repository, never()).save(failedItem);
        verify(repository).save(nextItem);
        verifyNoInteractions(recorder);
    }

    @Test
    void defensivelySkipsPausedInactiveAndPublicItems() {
        WishlistItemRepository repository = mock(WishlistItemRepository.class);
        WishlistPriceSnapshotProvider provider = mock(WishlistPriceSnapshotProvider.class);
        WishlistAlertEventRecorder recorder = mock(WishlistAlertEventRecorder.class);
        WishlistItem paused = item(1L, 7L, true, false, "$30.00", "$20.00");
        WishlistItem inactive = item(2L, 7L, false, true, "$30.00", "$20.00");
        WishlistItem publicItem = item(3L, null, true, true, "$30.00", "$20.00");
        when(repository.findActiveUserAlertItemsForRefresh())
                .thenReturn(List.of(paused, inactive, publicItem));

        WishlistPriceRefreshSummary summary = service(repository, provider, recorder)
                .refreshActiveWishlistAlerts();

        assertEquals(new WishlistPriceRefreshSummary(3, 0, 0, 3), summary);
        verifyNoInteractions(provider, recorder);
        verify(repository, never()).save(paused);
        verify(repository, never()).save(inactive);
        verify(repository, never()).save(publicItem);
    }

    private static WishlistPriceRefreshService service(
            WishlistItemRepository repository,
            WishlistPriceSnapshotProvider provider,
            WishlistAlertEventRecorder recorder) {
        return service(
                repository,
                provider,
                recorder,
                mock(WishlistPriceHistoryService.class));
    }

    private static WishlistPriceRefreshService service(
            WishlistItemRepository repository,
            WishlistPriceSnapshotProvider provider,
            WishlistAlertEventRecorder recorder,
            WishlistPriceHistoryService historyService) {
        return new WishlistPriceRefreshService(
                repository, provider, recorder, historyService);
    }

    private static WishlistItem item(
            long id,
            Long userId,
            boolean active,
            boolean alertActive,
            String currentPrice,
            String targetPrice) {
        return new WishlistItem(
                id,
                "New Game",
                "Steam",
                currentPrice,
                targetPrice,
                "$25.00",
                null,
                "tracking",
                alertActive,
                "medium",
                active,
                userId
        );
    }
}
