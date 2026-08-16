package com.nexora.api.wishlist;

import com.nexora.api.wishlist.persistence.WishlistItemRepository;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DatabaseWishlistServiceTests {

    @Test
    void mapsActiveRepositoryItemsToTheExistingApiContract() {
        WishlistItemRepository repository = mock(WishlistItemRepository.class);
        com.nexora.api.wishlist.persistence.WishlistItem databaseItem =
                new com.nexora.api.wishlist.persistence.WishlistItem(
                        1L,
                        "Ghost of Tsushima: Director's Cut",
                        "Steam",
                        "$39.99",
                        "$24.99",
                        "$29.99",
                        "-25%",
                        "price-drop",
                        true,
                        "high",
                        true
                );
        com.nexora.api.wishlist.persistence.WishlistItem itemWithoutDiscount =
                new com.nexora.api.wishlist.persistence.WishlistItem(
                        2L,
                        "Monster Hunter Wilds",
                        "Epic Games",
                        "$69.99",
                        "$44.99",
                        "$59.99",
                        null,
                        "tracking",
                        true,
                        "medium",
                        true
                );
        when(repository.findActiveWishlistItems())
                .thenReturn(List.of(databaseItem, itemWithoutDiscount));

        List<WishlistItem> wishlistItems =
                new DatabaseWishlistService(repository).getWishlistItems();

        assertEquals(2, wishlistItems.size());
        WishlistItem item = wishlistItems.get(0);
        assertAll(
                () -> assertEquals(1L, item.id()),
                () -> assertEquals("Ghost of Tsushima: Director's Cut", item.title()),
                () -> assertEquals("Steam", item.store()),
                () -> assertEquals("$39.99", item.currentPrice()),
                () -> assertEquals("$24.99", item.targetPrice()),
                () -> assertEquals("$29.99", item.lowestEver()),
                () -> assertEquals("-25%", item.discount()),
                () -> assertEquals("price-drop", item.status()),
                () -> assertTrue(item.alertActive()),
                () -> assertEquals("high", item.priority()),
                () -> assertNull(wishlistItems.get(1).discount())
        );
        verify(repository).findActiveWishlistItems();
    }
}
