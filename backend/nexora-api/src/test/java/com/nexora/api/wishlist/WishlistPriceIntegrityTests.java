package com.nexora.api.wishlist;

import com.nexora.api.deals.CheapSharkDealClient;
import com.nexora.api.deals.CheapSharkDealResponse;
import com.nexora.api.deals.CheapSharkStoreDirectory;
import com.nexora.api.deals.CheapSharkStoreResponse;
import com.nexora.api.notifications.NotificationDispatcher;
import com.nexora.api.notifications.preferences.NotificationPreferenceResponse;
import com.nexora.api.notifications.preferences.UserNotificationPreferenceService;
import com.nexora.api.wishlist.persistence.WishlistAlertEvent;
import com.nexora.api.wishlist.persistence.WishlistAlertEventRepository;
import com.nexora.api.wishlist.persistence.WishlistItemRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class WishlistPriceIntegrityTests {

    private static final Map<String, String> STORES = Map.of("1", "Steam", "2", "GOG");
    private final CheapSharkWishlistLiveLookup lookup = mock(CheapSharkWishlistLiveLookup.class);

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void identicalFirstVerifiedPriceRecordsObservationAndTargetTransition(boolean database) {
        UserWishlistService service = service(database);
        WishlistItem item = service.addWishlistItem(7, request("Game", "$8.00", "$10.00", "USD"));
        assertTrue(item.alertEvaluation().targetReached());
        offer("Game", "$8.00");

        UserWishlistRefreshResponse first = service.refreshWishlistPrices(7);
        assertEquals(1, first.matchedItems());
        assertEquals(1, first.updatedItems());
        assertAll(
                () -> assertEquals(1, first.observationsRecorded()),
                () -> assertEquals(1, first.targetReachedEventsCreated()));
        var points = service.getWishlistPriceHistory(7, item.id(), 10);
        assertEquals(List.of("wishlist-create", "cheapshark-refresh"),
                points.stream().map(WishlistPriceHistoryPoint::source).toList());
        assertTrue(points.stream().allMatch(point -> "deal-id".equals(point.externalDealId())));

        UserWishlistRefreshResponse repeated = service.refreshWishlistPrices(7);
        assertEquals(0, repeated.updatedItems());
        assertEquals(0, repeated.observationsRecorded());
        assertEquals(0, repeated.targetReachedEventsCreated());
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void unknownCurrencyStaysUnverifiedAndKeepsOnlyTheEnteredLabel(boolean database) {
        UserWishlistService service = service(database);
        WishlistItem item = service.addWishlistItem(7, request("Game", "8.00", "10.00", "UNKNOWN"));
        offer("Game", "$8.00");

        assertEquals("UNKNOWN", item.currency());
        assertEquals("not-evaluable", item.alertEvaluation().state());
        assertEquals("8.00", service.getWishlistPriceHistory(7, item.id(), 10).get(0).priceLabel());
        assertNull(service.getWishlistPriceHistory(7, item.id(), 10).get(0).priceAmount());
        assertEquals(0, service.refreshWishlistPrices(7).matchedItems());
        verify(lookup, never()).lookup(anyString(), anyString(), anyString(), anyMap());
    }

    @Test
    void distinguishesExplicitCurrencyBareAmountsAndFreeOffers() {
        assertAll(
                () -> assertFalse(WishlistAlertEvaluator.evaluate("8.00", "10.00", true).targetReached()),
                () -> assertFalse(WishlistAlertEvaluator.evaluate("$8.00", "$10.00", true, "UNKNOWN").targetReached()),
                () -> assertFalse(WishlistAlertEvaluator.evaluate("$0.00", "€10.00", true, "USD").targetReached()),
                () -> assertFalse(WishlistAlertEvaluator.evaluate("FREE", "10.00", true, "UNKNOWN").targetReached()),
                () -> assertTrue(WishlistAlertEvaluator.evaluate("FREE", "€10.00", true).targetReached()),
                () -> assertTrue(WishlistAlertEvaluator.evaluate("CAD 8.00", "10.00", true).targetReached()));
        assertNull(WishlistPriceParser.parse("FREE", "UNKNOWN").orElseThrow().currency());
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void eachRefreshCycleTraversesCheckedAndUncheckedItemsWithGaps(boolean database) {
        UserWishlistService service = service(database);
        for (int i = 0; i < 2; i++) addBatchItem(service, i);
        assertEquals(2, service.refreshWishlistPrices(7).matchedItems());
        for (int i = 2; i < 13; i++) addBatchItem(service, i);

        for (int cycle = 0; cycle < 2; cycle++) {
            UserWishlistRefreshResponse first = service.refreshWishlistPrices(7);
            assertEquals(10, first.matchedItems());
            assertTrue(first.hasMore());
            assertNotNull(first.nextCursor());
            UserWishlistRefreshResponse second = service.refreshWishlistPrices(7, first.nextCursor());
            assertEquals(3, second.matchedItems());
            assertFalse(second.hasMore());
            assertNull(second.nextCursor());
            assertEquals(cycle == 0 ? 11 : 0,
                    first.observationsRecorded() + second.observationsRecorded());
        }
        for (int i = 0; i < 13; i++) {
            verify(lookup, times(i < 2 ? 3 : 2)).lookup("Game " + i, "Steam", "123", STORES);
        }
        verify(lookup, never()).lookup(eq("Other account"), anyString(), anyString(), anyMap());
    }

    @Test
    void scheduledProviderRejectsWrongGameWrongStoreAndAmbiguousOffers() {
        CheapSharkDealClient client = mock(CheapSharkDealClient.class);
        var provider = new CheapSharkWishlistPriceSnapshotProvider(
                client, new CheapSharkStoreDirectory(), new WishlistPriceRefreshProperties());
        when(client.getStores()).thenReturn(List.of(
                new CheapSharkStoreResponse("1", "Steam", 1),
                new CheapSharkStoreResponse("2", "GOG", 1)));
        var item = new com.nexora.api.wishlist.persistence.WishlistItem(
                1L, "Game", "Steam", "$10.00", "$9.00", "$10.00", null,
                "tracking", true, "medium", true, 7L, "123", null, "USD", null);
        when(client.getDeals(8, "Game", null))
                .thenReturn(List.of(deal("1", "999", "6.00")))
                .thenReturn(List.of(deal("2", "123", "6.00")))
                .thenReturn(List.of(deal("1", "123", "6.00"), deal("1", "123", "8.00")))
                .thenReturn(List.of(deal("1", "123", "6.00")));
        assertAll(
                () -> assertTrue(provider.findCurrentPrice(item).isEmpty(), "wrong game"),
                () -> assertTrue(provider.findCurrentPrice(item).isEmpty(), "wrong store"),
                () -> assertTrue(provider.findCurrentPrice(item).isEmpty(), "conflicting prices"),
                () -> assertEquals(Optional.of("$6.00"), provider.findCurrentPrice(item)));
    }

    @Test
    void unverifiedTargetEventCannotDispatchWithOptedInPreferences() {
        var events = mock(WishlistAlertEventRepository.class);
        var preferences = mock(UserNotificationPreferenceService.class);
        var dispatcher = mock(NotificationDispatcher.class);
        when(events.saveAndFlush(any())).thenAnswer(call -> call.getArgument(0));
        when(preferences.getPreferences(7)).thenReturn(
                new NotificationPreferenceResponse(true, true, true, true, true));
        var item = new com.nexora.api.wishlist.persistence.WishlistItem(
                1L, "Game", "Steam", "$8.00", "$10.00", "$8.00", null,
                "tracking", true, "medium", true, 7L);
        var recorder = new WishlistAlertEventRecorder(events, dispatcher, preferences);
        assertTrue(recorder.recordTargetReachedEvent(7, item,
                WishlistAlertEvaluator.evaluate("$8.00", "$10.00", true), "wishlist-create"));
        verify(events).saveAndFlush(any(WishlistAlertEvent.class));
        verifyNoInteractions(dispatcher, preferences);
    }

    private void addBatchItem(UserWishlistService service, int index) {
        service.addWishlistItem(8, request("Other account", "$20.00", "$10.00", "USD"));
        // Delete and re-add the second account's item so the first account's IDs have gaps.
        service.deleteWishlistItem(8, service.getWishlistItems(8).get(0).id());
        service.addWishlistItem(7, request("Game " + index, "$20.00", "$10.00", "USD"));
        offer("Game " + index, "$15.00");
    }

    private UserWishlistService service(boolean database) {
        when(lookup.isEnabled()).thenReturn(true);
        when(lookup.loadStoreLookup()).thenReturn(STORES);
        var history = new WishlistPriceHistoryService(new InMemoryWishlistPriceHistoryStore());
        if (!database) {
            return new InMemoryUserWishlistService(history, lookup);
        }

        var repo = mock(WishlistItemRepository.class);
        var events = mock(WishlistAlertEventRepository.class);
        var rows = new ArrayList<com.nexora.api.wishlist.persistence.WishlistItem>();
        when(repo.saveAndFlush(any())).thenAnswer(call -> {
            com.nexora.api.wishlist.persistence.WishlistItem row = call.getArgument(0);
            if (row.getId() == null) {
                ReflectionTestUtils.setField(row, "id", (long) (rows.size() + 1));
                rows.add(row);
            }
            return row;
        });
        when(repo.findByUserIdAndActiveTrueOrderById(anyLong())).thenAnswer(call ->
                rows.stream().filter(row -> row.isActive() && row.getUserId().equals(call.getArgument(0))).toList());
        when(repo.findByIdAndUserIdAndActiveTrue(anyLong(), anyLong())).thenAnswer(call ->
                rows.stream().filter(row -> row.isActive() && row.getId().equals(call.getArgument(0))
                        && row.getUserId().equals(call.getArgument(1))).findFirst());
        when(repo.findForUpdateByIdAndUserIdAndActiveTrue(anyLong(), anyLong())).thenAnswer(call ->
                rows.stream().filter(row -> row.isActive() && row.getId().equals(call.getArgument(0))
                        && row.getUserId().equals(call.getArgument(1))).findFirst());
        when(events.saveAndFlush(any())).thenAnswer(call -> call.getArgument(0));
        var recorder = new WishlistAlertEventRecorder(events, mock(NotificationDispatcher.class),
                mock(UserNotificationPreferenceService.class));
        return new DatabaseUserWishlistService(repo, events, recorder, history, lookup);
    }

    private void offer(String title, String price) {
        when(lookup.lookup(title, "Steam", "123", STORES)).thenReturn(Optional.of(
                new CheapSharkWishlistLiveLookup.ObservedOffer(price,
                        new BigDecimal(price.substring(1)), "USD", null, "123", "deal-id", null)));
    }

    private static AddWishlistItemRequest request(String title, String current, String target, String currency) {
        return new AddWishlistItemRequest(title, "Steam", current, target, null, null, null,
                true, null, "123", "deal-id", currency, null);
    }

    private static CheapSharkDealResponse deal(String store, String game, String price) {
        return new CheapSharkDealResponse("Game", store, price, "10.00", "40",
                "95", "9.0", "deal-id", game, null, null, "90", 1700000200L);
    }
}
