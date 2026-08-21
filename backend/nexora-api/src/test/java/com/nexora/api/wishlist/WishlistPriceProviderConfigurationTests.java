package com.nexora.api.wishlist;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;

@SpringBootTest(
        properties = "nexora.wishlist.price-refresh.provider=cheapshark"
)
class WishlistPriceProviderConfigurationTests {

    @Autowired
    private List<WishlistPriceSnapshotProvider> providers;

    @Test
    void providerSelectorLoadsOnlyCheapSharkProvider() {
        assertEquals(1, providers.size());
        assertInstanceOf(CheapSharkWishlistPriceSnapshotProvider.class, providers.get(0));
    }
}

@SpringBootTest(
        properties = "nexora.wishlist.price-refresh.cheapshark.enabled=true"
)
class WishlistPriceProviderEnabledFlagTests {

    @Autowired
    private List<WishlistPriceSnapshotProvider> providers;

    @Test
    void enabledFlagOverridesStoredDefaultWithoutCreatingDuplicateProvider() {
        assertEquals(1, providers.size());
        assertInstanceOf(CheapSharkWishlistPriceSnapshotProvider.class, providers.get(0));
    }
}
