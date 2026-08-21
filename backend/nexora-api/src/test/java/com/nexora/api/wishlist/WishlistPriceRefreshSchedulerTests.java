package com.nexora.api.wishlist;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WishlistPriceRefreshSchedulerTests {

    @Test
    void delegatesToRefreshService() {
        WishlistPriceRefreshService service = mock(WishlistPriceRefreshService.class);
        when(service.refreshActiveWishlistAlerts()).thenReturn(
                new WishlistPriceRefreshSummary(2, 1, 1, 0));

        new WishlistPriceRefreshScheduler(service).refreshWishlistPrices();

        verify(service).refreshActiveWishlistAlerts();
    }

    @Test
    void catchesRefreshFailuresSoTheSchedulerCanRunAgain() {
        WishlistPriceRefreshService service = mock(WishlistPriceRefreshService.class);
        when(service.refreshActiveWishlistAlerts())
                .thenThrow(new IllegalStateException("provider unavailable"));

        WishlistPriceRefreshScheduler scheduler = new WishlistPriceRefreshScheduler(service);

        assertDoesNotThrow(scheduler::refreshWishlistPrices);
        verify(service).refreshActiveWishlistAlerts();
    }
}
