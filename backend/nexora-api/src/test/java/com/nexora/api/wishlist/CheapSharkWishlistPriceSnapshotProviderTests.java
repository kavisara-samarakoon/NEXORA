package com.nexora.api.wishlist;

import com.nexora.api.deals.CheapSharkDealClient;
import com.nexora.api.deals.CheapSharkDealResponse;
import com.nexora.api.deals.CheapSharkStoreDirectory;
import com.nexora.api.deals.CheapSharkStoreResponse;
import com.nexora.api.wishlist.persistence.WishlistItem;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class CheapSharkWishlistPriceSnapshotProviderTests {

    @Test
    void exactTitleAndStoreReturnsFormattedSalePrice() {
        CheapSharkDealClient client = mock(CheapSharkDealClient.class);
        WishlistItem item = item("Persona 5 Royal", "Steam");
        when(client.getDeals(8, "Persona 5 Royal", null)).thenReturn(List.of(
                deal("Persona 5 Royal", "1", "12.345")
        ));
        when(client.getStores()).thenReturn(List.of(store("1", "Steam")));

        Optional<String> price = provider(client).findCurrentPrice(item);

        assertEquals(Optional.of("$12.35"), price);
        verify(client).getDeals(8, "Persona 5 Royal", null);
        verify(client).getStores();
    }

    @Test
    void zeroSalePriceReturnsFree() {
        CheapSharkDealClient client = mock(CheapSharkDealClient.class);
        when(client.getDeals(8, "Free Game", null)).thenReturn(List.of(
                deal("Free Game", "1", "0.00")
        ));
        when(client.getStores()).thenReturn(List.of(store("1", "Steam")));

        Optional<String> price = provider(client)
                .findCurrentPrice(item("Free Game", "Steam"));

        assertEquals(Optional.of("FREE"), price);
    }

    @Test
    void prefersCorrectStoreWhenTitlesAreEquallyConfident() {
        CheapSharkDealClient client = mock(CheapSharkDealClient.class);
        when(client.getDeals(8, "Persona 5 Royal", null)).thenReturn(List.of(
                deal("Persona 5 Royal", "2", "5.00"),
                deal("Persona 5 Royal", "1", "10.00")
        ));
        when(client.getStores()).thenReturn(List.of(
                store("1", "Steam"),
                store("2", "GOG")
        ));

        Optional<String> price = provider(client)
                .findCurrentPrice(item("Persona 5 Royal", "Steam"));

        assertEquals(Optional.of("$10.00"), price);
    }

    @Test
    void acceptsAConservativeMultiwordContainsMatch() {
        CheapSharkDealClient client = mock(CheapSharkDealClient.class);
        when(client.getDeals(8, "Persona 5 Royal", null)).thenReturn(List.of(
                deal("Persona 5 Royal Edition", "1", "18.00")
        ));
        when(client.getStores()).thenReturn(List.of(store("1", "Steam")));

        Optional<String> price = provider(client)
                .findCurrentPrice(item("Persona 5 Royal", "Steam"));

        assertEquals(Optional.of("$18.00"), price);
    }

    @Test
    void rejectsAnUnconfidentBaseGameTitleMatch() {
        CheapSharkDealClient client = mock(CheapSharkDealClient.class);
        when(client.getDeals(8, "Starfield: Shattered Space", null)).thenReturn(List.of(
                deal("Starfield", "1", "19.99")
        ));

        Optional<String> price = provider(client)
                .findCurrentPrice(item("Starfield: Shattered Space", "Steam"));

        assertEquals(Optional.empty(), price);
        verify(client, never()).getStores();
    }

    @Test
    void skipsInvalidSalePrices() {
        CheapSharkDealClient client = mock(CheapSharkDealClient.class);
        when(client.getDeals(8, "Persona 5 Royal", null)).thenReturn(List.of(
                deal("Persona 5 Royal", "1", "not-a-price"),
                deal("Persona 5 Royal", "1", "-1.00")
        ));

        Optional<String> price = provider(client)
                .findCurrentPrice(item("Persona 5 Royal", "Steam"));

        assertEquals(Optional.empty(), price);
        verify(client, never()).getStores();
    }

    @Test
    void dealLookupFailureReturnsEmpty() {
        CheapSharkDealClient client = mock(CheapSharkDealClient.class);
        when(client.getDeals(8, "Persona 5 Royal", null))
                .thenThrow(new IllegalStateException("provider unavailable"));

        Optional<String> price = provider(client)
                .findCurrentPrice(item("Persona 5 Royal", "Steam"));

        assertEquals(Optional.empty(), price);
        verify(client, never()).getStores();
    }

    @Test
    void storeLookupFailureRejectsEvenASafeTitleMatch() {
        CheapSharkDealClient client = mock(CheapSharkDealClient.class);
        when(client.getDeals(8, "Ghost of Tsushima: Director's Cut", null))
                .thenReturn(List.of(
                        deal("Ghost of Tsushima Directors Cut", "1", "29.99")
                ));
        when(client.getStores())
                .thenThrow(new IllegalStateException("stores unavailable"));

        Optional<String> price = provider(client).findCurrentPrice(
                item("Ghost of Tsushima: Director's Cut", "Steam"));

        assertEquals(Optional.empty(), price);
    }

    @Test
    void blankOrNullRequiredItemFieldsReturnEmptyWithoutCallingCheapShark() {
        CheapSharkDealClient client = mock(CheapSharkDealClient.class);
        CheapSharkWishlistPriceSnapshotProvider provider = provider(client);

        assertAll(
                () -> assertEquals(Optional.empty(), provider.findCurrentPrice(null)),
                () -> assertEquals(
                        Optional.empty(),
                        provider.findCurrentPrice(item("   ", "Steam"))),
                () -> assertEquals(
                        Optional.empty(),
                        provider.findCurrentPrice(item("Persona 5 Royal", null)))
        );
        verifyNoInteractions(client);
    }

    private static CheapSharkWishlistPriceSnapshotProvider provider(
            CheapSharkDealClient client) {
        return new CheapSharkWishlistPriceSnapshotProvider(
                client,
                new CheapSharkStoreDirectory(),
                new WishlistPriceRefreshProperties()
        );
    }

    private static CheapSharkDealResponse deal(
            String title,
            String storeId,
            String salePrice) {
        return new CheapSharkDealResponse(
                title,
                storeId,
                salePrice,
                "59.99",
                "50",
                "90",
                "9.0",
                "deal-id"
        );
    }

    private static CheapSharkStoreResponse store(String storeId, String storeName) {
        return new CheapSharkStoreResponse(storeId, storeName, true);
    }

    private static WishlistItem item(String title, String store) {
        return new WishlistItem(
                1L,
                title,
                store,
                "$39.99",
                "$20.00",
                "$39.99",
                null,
                "tracking",
                true,
                "medium",
                true,
                7L
        );
    }
}
