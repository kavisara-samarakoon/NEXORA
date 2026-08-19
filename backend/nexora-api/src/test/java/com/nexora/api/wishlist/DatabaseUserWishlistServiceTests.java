package com.nexora.api.wishlist;

import com.nexora.api.wishlist.persistence.WishlistItemRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DatabaseUserWishlistServiceTests {

    @Test
    void createsAnOwnedItemWithSafeDefaults() {
        WishlistItemRepository repository = mock(WishlistItemRepository.class);
        DatabaseUserWishlistService service = new DatabaseUserWishlistService(repository);
        AddWishlistItemRequest request = new AddWishlistItemRequest(
                "New Game", "Steam", "$30.00", "$20.00",
                null, null, null, null, null);
        com.nexora.api.wishlist.persistence.WishlistItem savedItem = databaseItem(42L, 7L, true);
        when(repository.saveAndFlush(org.mockito.ArgumentMatchers.any())).thenReturn(savedItem);

        WishlistItem response = service.addWishlistItem(7L, request);

        ArgumentCaptor<com.nexora.api.wishlist.persistence.WishlistItem> captor =
                ArgumentCaptor.forClass(com.nexora.api.wishlist.persistence.WishlistItem.class);
        verify(repository).saveAndFlush(captor.capture());
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
    void listsOnlyRepositoryItemsForTheRequestedUser() {
        WishlistItemRepository repository = mock(WishlistItemRepository.class);
        when(repository.findByUserIdAndActiveTrueOrderById(7L))
                .thenReturn(List.of(databaseItem(42L, 7L, true)));

        List<WishlistItem> items = new DatabaseUserWishlistService(repository).getWishlistItems(7L);

        assertEquals(1, items.size());
        assertEquals(42L, items.get(0).id());
        verify(repository).findByUserIdAndActiveTrueOrderById(7L);
    }

    @Test
    void softDeletesOnlyAnOwnedActiveItem() {
        WishlistItemRepository repository = mock(WishlistItemRepository.class);
        com.nexora.api.wishlist.persistence.WishlistItem item = databaseItem(42L, 7L, true);
        when(repository.findByIdAndUserIdAndActiveTrue(42L, 7L)).thenReturn(Optional.of(item));

        new DatabaseUserWishlistService(repository).deleteWishlistItem(7L, 42L);

        assertFalse(item.isActive());
        verify(repository).saveAndFlush(item);
    }

    private static com.nexora.api.wishlist.persistence.WishlistItem databaseItem(
            long id, long userId, boolean active) {
        return new com.nexora.api.wishlist.persistence.WishlistItem(
                id,
                "New Game",
                "Steam",
                "$30.00",
                "$20.00",
                "$25.00",
                null,
                "tracking",
                true,
                "medium",
                active,
                userId
        );
    }
}
