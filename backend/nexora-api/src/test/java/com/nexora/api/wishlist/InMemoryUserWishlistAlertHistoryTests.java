package com.nexora.api.wishlist;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;

class InMemoryUserWishlistAlertHistoryTests {

    @Test
    void returnsOnlyTheLatestFiftyEventsInNewestFirstOrder() {
        InMemoryUserWishlistService service = new InMemoryUserWishlistService(
                mock(WishlistPriceHistoryService.class));
        WishlistItem item = addWatchingItem(service, 7L, "Bounded history");

        createTargetReachedEvents(service, 7L, item.id(), 55);

        List<WishlistAlertEventResponse> events = service.getWishlistAlertEvents(7L);

        assertAll(
                () -> assertEquals(50, events.size()),
                () -> assertEquals(55L, events.get(0).id()),
                () -> assertEquals(6L, events.get(events.size() - 1).id()),
                () -> assertTrue(events.stream()
                        .map(WishlistAlertEventResponse::id)
                        .reduce((newer, older) -> newer > older ? older : -1L)
                        .orElseThrow() > 0)
        );
    }

    @Test
    void evictsTheOldestEventAfterThePerUserRetentionCap() {
        InMemoryUserWishlistService service = serviceWithLimits(100, 100);
        WishlistItem item = addWatchingItem(service, 7L, "Retained history");

        createTargetReachedEvents(service, 7L, item.id(), 101);

        List<WishlistAlertEventResponse> events = service.getWishlistAlertEvents(7L);

        assertAll(
                () -> assertEquals(100, events.size()),
                () -> assertEquals(101L, events.get(0).id()),
                () -> assertEquals(2L, events.get(events.size() - 1).id()),
                () -> assertTrue(events.stream().noneMatch(event -> event.id() == 1L))
        );
    }

    @Test
    void retainsAndReturnsEventsIndependentlyForEachUser() {
        InMemoryUserWishlistService service = serviceWithLimits(10, 2);
        WishlistItem firstUserItem = addWatchingItem(service, 7L, "First user game");
        WishlistItem secondUserItem = addWatchingItem(service, 8L, "Second user game");

        createTargetReachedEvents(service, 7L, firstUserItem.id(), 3);
        createTargetReachedEvents(service, 8L, secondUserItem.id(), 1);

        List<WishlistAlertEventResponse> firstUserEvents =
                service.getWishlistAlertEvents(7L);
        List<WishlistAlertEventResponse> secondUserEvents =
                service.getWishlistAlertEvents(8L);

        assertAll(
                () -> assertEquals(2, firstUserEvents.size()),
                () -> assertEquals("First user game", firstUserEvents.get(0).itemTitle()),
                () -> assertEquals(1, secondUserEvents.size()),
                () -> assertEquals("Second user game", secondUserEvents.get(0).itemTitle()),
                () -> assertEquals(secondUserItem.id(),
                        secondUserEvents.get(0).wishlistItemId()),
                () -> assertEquals("target-reached",
                        secondUserEvents.get(0).evaluationState()),
                () -> assertTrue(secondUserEvents.get(0).targetReached()),
                () -> assertNotNull(secondUserEvents.get(0).createdAt())
        );
    }

    private static InMemoryUserWishlistService serviceWithLimits(
            int responseLimit, int retentionLimit) {
        return new InMemoryUserWishlistService(
                mock(WishlistPriceHistoryService.class),
                responseLimit,
                retentionLimit
        );
    }

    private static WishlistItem addWatchingItem(
            InMemoryUserWishlistService service, long userId, String title) {
        return service.addWishlistItem(
                userId,
                new AddWishlistItemRequest(
                        title,
                        "Steam",
                        "$30.00",
                        "$20.00",
                        null,
                        null,
                        "tracking",
                        true,
                        "medium"
                )
        );
    }

    private static void createTargetReachedEvents(
            InMemoryUserWishlistService service,
            long userId,
            long itemId,
            int count) {
        for (int eventNumber = 0; eventNumber < count; eventNumber++) {
            service.updateWishlistAlert(
                    userId,
                    itemId,
                    new UpdateWishlistAlertRequest("$40.00", null, null)
            );
            service.updateWishlistAlert(
                    userId,
                    itemId,
                    new UpdateWishlistAlertRequest("$20.00", null, null)
            );
        }
    }
}
