package com.nexora.api.wishlist;

import com.nexora.api.deals.CheapSharkDealClient;
import com.nexora.api.deals.CheapSharkDealResponse;
import com.nexora.api.deals.CheapSharkStoreDirectory;
import com.nexora.api.deals.CheapSharkStoreResponse;
import com.nexora.api.deals.ExternalDealsCache;
import com.nexora.api.deals.ExternalDealsProperties;
import com.nexora.api.deals.ExternalProviderRequestBudget;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class CheapSharkWishlistLiveLookupTests {

    @Test
    void matchesLinkedExternalGameIdAndVerifiedStore() {
        CheapSharkDealClient client = mock(CheapSharkDealClient.class);
        when(client.getStores()).thenReturn(List.of(
                new CheapSharkStoreResponse("1", "Steam", 1),
                new CheapSharkStoreResponse("25", "Epic Games Store", 1)
        ));
        when(client.getDeals(12, "Hades II", null)).thenReturn(List.of(
                deal("Hades II", "1", "14.99", "50.0", "99999", "wrongDeal", "https://cdn.example.com/wrong.jpg"),
                deal("Hades II", "25", "18.99", "25.0", "20202", "epicDeal", "https://cdn.example.com/epic.jpg"),
                deal("Hades II", "1", "19.99", "33.34", "20202", "deal%2Fhades2",
                        "https://shared.fastly.steamstatic.com/header.jpg")
        ));

        CheapSharkWishlistLiveLookup lookup = lookup(client, false);
        Optional<CheapSharkWishlistLiveLookup.ObservedOffer> result =
                lookup.lookup("Hades II", "Steam", "20202");

        assertTrue(result.isPresent());
        CheapSharkWishlistLiveLookup.ObservedOffer offer = result.get();
        assertAll(
                () -> assertEquals("$19.99", offer.priceLabel()),
                () -> assertEquals(new BigDecimal("19.99"), offer.priceAmount()),
                () -> assertEquals("USD", offer.currency()),
                () -> assertEquals("-33%", offer.discount()),
                () -> assertEquals("20202", offer.externalGameId()),
                () -> assertEquals("deal%2Fhades2", offer.externalDealId()),
                () -> assertEquals("https://shared.fastly.steamstatic.com/header.jpg", offer.thumbUrl())
        );
    }

    @Test
    void rejectsWrongExternalGameIdEvenWhenTitleAndStoreMatch() {
        CheapSharkDealClient client = mock(CheapSharkDealClient.class);
        when(client.getStores()).thenReturn(List.of(
                new CheapSharkStoreResponse("1", "Steam", 1)
        ));
        when(client.getDeals(12, "Hades II", null)).thenReturn(List.of(
                deal("Hades II", "1", "9.99", "66.0", "99999", "wrongDeal", "https://cdn.example.com/a.jpg")
        ));

        CheapSharkWishlistLiveLookup lookup = lookup(client, false);
        assertEquals(Optional.empty(), lookup.lookup("Hades II", "Steam", "20202"));
    }

    @Test
    void rejectsWrongStoreAndReturnsEmptyWhenStoreDirectoryUnavailable() {
        CheapSharkDealClient client = mock(CheapSharkDealClient.class);
        when(client.getStores()).thenReturn(List.of(
                new CheapSharkStoreResponse("1", "Steam", 1),
                new CheapSharkStoreResponse("7", "GOG", 1)
        ));
        when(client.getDeals(12, "Hollow Knight", null)).thenReturn(List.of(
                deal("Hollow Knight", "7", "7.49", "50.0", "145000", "gogDeal", null)
        ));

        CheapSharkWishlistLiveLookup lookup = lookup(client, false);
        assertEquals(Optional.empty(), lookup.lookup("Hollow Knight", "Steam", "145000"));
        assertEquals(Optional.empty(), lookup.lookup("Hollow Knight", "GOG", "145000", Map.of()));
    }

    @Test
    void matchesEpicGamesStoreAliasConservatively() {
        CheapSharkDealClient client = mock(CheapSharkDealClient.class);
        when(client.getDeals(12, "Alan Wake 2", null)).thenReturn(List.of(
                deal("Alan Wake 2", "25", "24.99", "50.0", "31000", "epicDeal", "https://cdn.example.com/aw2.jpg")
        ));

        CheapSharkWishlistLiveLookup lookup = lookup(client, false);
        Optional<CheapSharkWishlistLiveLookup.ObservedOffer> result = lookup.lookup(
                "Alan Wake 2",
                "Epic Games",
                null,
                Map.of("25", "Epic Games Store")
        );

        assertTrue(result.isPresent());
        assertEquals("31000", result.get().externalGameId());
        assertEquals("$24.99", result.get().priceLabel());
    }

    @Test
    void rejectsAmbiguousDistinctGamesWithoutLinkedExternalGameId() {
        CheapSharkDealClient client = mock(CheapSharkDealClient.class);
        when(client.getDeals(12, "Control Ultimate", null)).thenReturn(List.of(
                deal("Control Ultimate", "1", "9.99", "75.0", "111", "deal1", null),
                deal("Control Ultimate", "1", "19.99", "50.0", "222", "deal2", null)
        ));

        CheapSharkWishlistLiveLookup lookup = lookup(client, false);
        Optional<CheapSharkWishlistLiveLookup.ObservedOffer> result = lookup.lookup(
                "Control Ultimate",
                "Steam",
                null,
                Map.of("1", "Steam")
        );

        assertFalse(result.isPresent());
    }

    @Test
    void prefersExactTitleOverSafeContainsEditionAndSanitizesUnsafeMetadata() {
        CheapSharkDealClient client = mock(CheapSharkDealClient.class);
        when(client.getDeals(12, "Persona 5 Royal", null)).thenReturn(List.of(
                deal("Persona 5 Royal Deluxe", "1", "29.99", "50.0", "401", "d1", null),
                deal("Persona 5 Royal", "1", "23.99", "60.0", "400", "bad deal id", "http://insecure.example.com/a.jpg")
        ));

        CheapSharkWishlistLiveLookup lookup = lookup(client, false);
        Optional<CheapSharkWishlistLiveLookup.ObservedOffer> result = lookup.lookup(
                "Persona 5 Royal",
                "Steam",
                null,
                Map.of("1", "Steam")
        );

        assertTrue(result.isPresent());
        assertAll(
                () -> assertEquals("400", result.get().externalGameId()),
                () -> assertEquals("$23.99", result.get().priceLabel()),
                () -> assertNull(result.get().externalDealId()),
                () -> assertNull(result.get().thumbUrl())
        );
    }

    @Test
    void sharesStoreAndDealCacheAcrossLookupsAndIgnoresUnverifiedLowestEver() {
        CheapSharkDealClient client = mock(CheapSharkDealClient.class);
        when(client.getStores()).thenReturn(List.of(new CheapSharkStoreResponse("1", "Steam", 1)));
        when(client.getDeals(12, "Elden Ring", null)).thenReturn(List.of(
                deal("Elden Ring", "1", "35.99", "40.0", "212", "eldenDeal", null)
        ));

        CheapSharkWishlistLiveLookup lookup = lookup(client, true);
        Map<String, String> storesFirst = lookup.loadStoreLookup();
        Map<String, String> storesSecond = lookup.loadStoreLookup();
        assertEquals(storesFirst, storesSecond);
        assertTrue(lookup.lookup("Elden Ring", "Steam", "212", storesFirst).isPresent());
        assertTrue(lookup.lookup("Elden Ring", "Steam", "212", storesSecond).isPresent());

        verify(client, times(1)).getStores();
        verify(client, times(1)).getDeals(12, "Elden Ring", null);

        CheapSharkWishlistLiveLookup.ObservedOffer offer =
                lookup.lookup("Elden Ring", "Steam", "212", storesFirst).orElseThrow();
        assertEquals("$35.99", CheapSharkWishlistLiveLookup.computeLowestEver("$5.00", false, offer));
        assertEquals("$5.00", CheapSharkWishlistLiveLookup.computeLowestEver("$5.00", true, offer));
    }

    @Test
    void doesNotCallExternalClientWhenExternalDealsDisabled() {
        CheapSharkDealClient client = mock(CheapSharkDealClient.class);
        ExternalDealsProperties properties = new ExternalDealsProperties();
        properties.setEnabled(false);
        CheapSharkWishlistLiveLookup lookup = new CheapSharkWishlistLiveLookup(
                client,
                new CheapSharkStoreDirectory(),
                properties,
                new ExternalProviderRequestBudget(),
                new ExternalDealsCache(properties)
        );

        assertTrue(lookup.loadStoreLookup().isEmpty());
        assertEquals(Optional.empty(), lookup.lookup("Hades II", "Steam", "20202", Map.of("1", "Steam")));
        verifyNoInteractions(client);
    }

    private static CheapSharkWishlistLiveLookup lookup(CheapSharkDealClient client, boolean cacheEnabled) {
        ExternalDealsProperties properties = new ExternalDealsProperties();
        properties.setEnabled(true);
        properties.getCache().setEnabled(cacheEnabled);
        return new CheapSharkWishlistLiveLookup(
                client,
                new CheapSharkStoreDirectory(),
                properties,
                new ExternalProviderRequestBudget(),
                new ExternalDealsCache(properties)
        );
    }

    private static CheapSharkDealResponse deal(
            String title,
            String storeId,
            String salePrice,
            String savings,
            String gameId,
            String dealId,
            String thumb) {
        return new CheapSharkDealResponse(
                title, storeId, salePrice, "59.99", savings,
                "95", "9.2", dealId, gameId, null, thumb, "92", 1700000100L
        );
    }
}
