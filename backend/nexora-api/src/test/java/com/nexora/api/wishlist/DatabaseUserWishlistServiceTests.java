package com.nexora.api.wishlist;

import com.nexora.api.notifications.NotificationDispatcher;
import com.nexora.api.wishlist.persistence.WishlistAlertEvent;
import com.nexora.api.wishlist.persistence.WishlistAlertEventRepository;
import com.nexora.api.wishlist.persistence.WishlistItemRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DatabaseUserWishlistServiceTests {

    @Test
    void createsAnOwnedItemWithSafeDefaults() {
        WishlistItemRepository repository = mock(WishlistItemRepository.class);
        WishlistAlertEventRepository eventRepository = mock(WishlistAlertEventRepository.class);
        DatabaseUserWishlistService service = service(repository, eventRepository);
        AddWishlistItemRequest request = new AddWishlistItemRequest(
                "New Game", "Steam", "$30.00", "$20.00",
                null, null, null, null, null);
        com.nexora.api.wishlist.persistence.WishlistItem savedItem = databaseItem(42L, 7L, true);
        when(repository.findFirstByUserIdAndActiveTrueAndTitleIgnoreCaseAndStoreIgnoreCaseOrderByIdAsc(
                7L, "New Game", "Steam")).thenReturn(Optional.empty());
        when(repository.saveAndFlush(org.mockito.ArgumentMatchers.any())).thenReturn(savedItem);

        WishlistItem response = service.addWishlistItem(7L, request);

        ArgumentCaptor<com.nexora.api.wishlist.persistence.WishlistItem> captor =
                ArgumentCaptor.forClass(com.nexora.api.wishlist.persistence.WishlistItem.class);
        verify(repository).saveAndFlush(captor.capture());
        verify(eventRepository, never()).saveAndFlush(any());
        com.nexora.api.wishlist.persistence.WishlistItem createdItem = captor.getValue();
        assertAll(
                () -> assertEquals(7L, createdItem.getUserId()),
                () -> assertEquals("tracking", createdItem.getStatus()),
                () -> assertEquals("medium", createdItem.getPriority()),
                () -> assertEquals("$30.00", createdItem.getLowestEver()),
                () -> assertEquals(42L, response.id())
        );
    }

    @Test
    void returnsExistingActiveItemForNormalizedDuplicate() {
        WishlistItemRepository repository = mock(WishlistItemRepository.class);
        WishlistAlertEventRepository eventRepository = mock(WishlistAlertEventRepository.class);
        DatabaseUserWishlistService service = service(repository, eventRepository);
        AddWishlistItemRequest request = new AddWishlistItemRequest(
                "  new game ", " steam ", "$15.00", "$10.00",
                null, null, null, null, null);
        com.nexora.api.wishlist.persistence.WishlistItem existingItem = databaseItem(
                42L, 7L, true, "$30.00", "$40.00", true);
        when(repository.findFirstByUserIdAndActiveTrueAndTitleIgnoreCaseAndStoreIgnoreCaseOrderByIdAsc(
                7L, "new game", "steam")).thenReturn(Optional.of(existingItem));

        WishlistItem response = service.addWishlistItem(7L, request);

        assertAll(
                () -> assertEquals(42L, response.id()),
                () -> assertEquals("New Game", response.title()),
                () -> assertEquals("Steam", response.store())
        );
        verify(repository, never()).saveAndFlush(any());
        verify(eventRepository, never()).saveAndFlush(any());
    }

    @Test
    void createsAnAlertEventWhenNewItemAlreadyReachedTarget() {
        WishlistItemRepository repository = mock(WishlistItemRepository.class);
        WishlistAlertEventRepository eventRepository = mock(WishlistAlertEventRepository.class);
        DatabaseUserWishlistService service = service(repository, eventRepository);
        AddWishlistItemRequest request = new AddWishlistItemRequest(
                "Reached Game", "Steam", "$8.88", "$9.99",
                null, null, null, true, null);
        com.nexora.api.wishlist.persistence.WishlistItem savedItem = databaseItem(
                42L, 7L, true, "$8.88", "$9.99", true);
        when(repository.findFirstByUserIdAndActiveTrueAndTitleIgnoreCaseAndStoreIgnoreCaseOrderByIdAsc(
                7L, "Reached Game", "Steam")).thenReturn(Optional.empty());
        when(repository.saveAndFlush(any())).thenReturn(savedItem);

        WishlistItem response = service.addWishlistItem(7L, request);

        ArgumentCaptor<WishlistAlertEvent> eventCaptor =
                ArgumentCaptor.forClass(WishlistAlertEvent.class);
        verify(eventRepository).saveAndFlush(eventCaptor.capture());
        WishlistAlertEvent event = eventCaptor.getValue();
        assertAll(
                () -> assertEquals("target-reached", response.alertEvaluation().state()),
                () -> assertEquals(7L, event.getUserId()),
                () -> assertEquals(42L, event.getWishlistItemId()),
                () -> assertEquals("target-reached", event.getEvaluationState()),
                () -> assertEquals(true, event.isTargetReached()),
                () -> assertEquals("Target price reached.", event.getMessage())
        );
    }

    @Test
    void listsOnlyRepositoryItemsForTheRequestedUser() {
        WishlistItemRepository repository = mock(WishlistItemRepository.class);
        WishlistAlertEventRepository eventRepository = mock(WishlistAlertEventRepository.class);
        when(repository.findByUserIdAndActiveTrueOrderById(7L))
                .thenReturn(List.of(databaseItem(42L, 7L, true)));

        List<WishlistItem> items = service(repository, eventRepository)
                .getWishlistItems(7L);

        assertEquals(1, items.size());
        assertEquals(42L, items.get(0).id());
        verify(repository).findByUserIdAndActiveTrueOrderById(7L);
    }

    @Test
    void softDeletesOnlyAnOwnedActiveItem() {
        WishlistItemRepository repository = mock(WishlistItemRepository.class);
        WishlistAlertEventRepository eventRepository = mock(WishlistAlertEventRepository.class);
        com.nexora.api.wishlist.persistence.WishlistItem item = databaseItem(42L, 7L, true);
        when(repository.findByIdAndUserIdAndActiveTrue(42L, 7L)).thenReturn(Optional.of(item));

        service(repository, eventRepository)
                .deleteWishlistItem(7L, 42L);

        assertFalse(item.isActive());
        verify(repository).saveAndFlush(item);
        verify(eventRepository, never()).saveAndFlush(any());
    }

    @Test
    void updatesOnlyProvidedAlertSettingsForOwnedActiveItem() {
        WishlistItemRepository repository = mock(WishlistItemRepository.class);
        WishlistAlertEventRepository eventRepository = mock(WishlistAlertEventRepository.class);
        com.nexora.api.wishlist.persistence.WishlistItem item = databaseItem(42L, 7L, true);
        when(repository.findByIdAndUserIdAndActiveTrue(42L, 7L)).thenReturn(Optional.of(item));
        when(repository.saveAndFlush(item)).thenReturn(item);

        WishlistItem response = service(repository, eventRepository)
                .updateWishlistAlert(
                        7L, 42L,
                        new UpdateWishlistAlertRequest("  $12.00  ", null, " low "));

        assertAll(
                () -> assertEquals("$12.00", response.targetPrice()),
                () -> assertEquals(true, response.alertActive()),
                () -> assertEquals("low", response.priority())
        );
        verify(repository).saveAndFlush(item);
        verify(eventRepository, never()).saveAndFlush(any());
    }

    @Test
    void createsAnAlertEventWhenUpdateTransitionsToTargetReached() {
        WishlistItemRepository repository = mock(WishlistItemRepository.class);
        WishlistAlertEventRepository eventRepository = mock(WishlistAlertEventRepository.class);
        com.nexora.api.wishlist.persistence.WishlistItem item = databaseItem(42L, 7L, true);
        when(repository.findByIdAndUserIdAndActiveTrue(42L, 7L)).thenReturn(Optional.of(item));
        when(repository.saveAndFlush(item)).thenReturn(item);

        WishlistItem response = service(repository, eventRepository)
                .updateWishlistAlert(
                        7L, 42L,
                        new UpdateWishlistAlertRequest("$40.00", null, null));

        ArgumentCaptor<WishlistAlertEvent> eventCaptor =
                ArgumentCaptor.forClass(WishlistAlertEvent.class);
        verify(eventRepository).saveAndFlush(eventCaptor.capture());
        assertAll(
                () -> assertEquals("target-reached", response.alertEvaluation().state()),
                () -> assertEquals("$40.00", eventCaptor.getValue().getTargetPrice()),
                () -> assertEquals(42L, eventCaptor.getValue().getWishlistItemId())
        );
    }

    @Test
    void doesNotCreateDuplicateEventWhenItemWasAlreadyTargetReached() {
        WishlistItemRepository repository = mock(WishlistItemRepository.class);
        WishlistAlertEventRepository eventRepository = mock(WishlistAlertEventRepository.class);
        com.nexora.api.wishlist.persistence.WishlistItem item = databaseItem(
                42L, 7L, true, "$8.88", "$9.99", true);
        when(repository.findByIdAndUserIdAndActiveTrue(42L, 7L)).thenReturn(Optional.of(item));
        when(repository.saveAndFlush(item)).thenReturn(item);

        WishlistItem response = service(repository, eventRepository)
                .updateWishlistAlert(
                        7L, 42L,
                        new UpdateWishlistAlertRequest(null, null, "high"));

        assertEquals("target-reached", response.alertEvaluation().state());
        verify(eventRepository, never()).saveAndFlush(any());
    }

    @Test
    void rejectsAlertUpdateWhenOwnedActiveItemIsMissing() {
        WishlistItemRepository repository = mock(WishlistItemRepository.class);
        WishlistAlertEventRepository eventRepository = mock(WishlistAlertEventRepository.class);
        when(repository.findByIdAndUserIdAndActiveTrue(42L, 7L)).thenReturn(Optional.empty());

        assertThrows(WishlistItemNotFoundException.class, () ->
                service(repository, eventRepository).updateWishlistAlert(
                        7L, 42L, new UpdateWishlistAlertRequest(null, false, null)));
        verify(repository, never()).saveAndFlush(any());
        verify(eventRepository, never()).saveAndFlush(any());
    }

    private static com.nexora.api.wishlist.persistence.WishlistItem databaseItem(
            long id, long userId, boolean active) {
        return databaseItem(id, userId, active, "$30.00", "$20.00", true);
    }

    private static com.nexora.api.wishlist.persistence.WishlistItem databaseItem(
            long id,
            long userId,
            boolean active,
            String currentPrice,
            String targetPrice,
            boolean alertActive) {
        return new com.nexora.api.wishlist.persistence.WishlistItem(
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

    private static DatabaseUserWishlistService service(
            WishlistItemRepository repository,
            WishlistAlertEventRepository eventRepository) {
        when(eventRepository.saveAndFlush(any()))
                .thenAnswer(invocation -> invocation.getArgument(0));
        return new DatabaseUserWishlistService(
                repository,
                eventRepository,
                new WishlistAlertEventRecorder(
                        eventRepository,
                        mock(NotificationDispatcher.class)
                )
        );
    }
}
