package com.nexora.api.wishlist;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@Profile("dev")
@ConditionalOnProperty(
        prefix = "nexora.wishlist.price-refresh",
        name = "enabled",
        havingValue = "true"
)
public class WishlistPriceRefreshScheduler {

    private static final Logger LOGGER =
            LoggerFactory.getLogger(WishlistPriceRefreshScheduler.class);

    private final WishlistPriceRefreshService priceRefreshService;

    public WishlistPriceRefreshScheduler(WishlistPriceRefreshService priceRefreshService) {
        this.priceRefreshService = priceRefreshService;
    }

    @Scheduled(fixedDelayString =
            "${nexora.wishlist.price-refresh.fixed-delay-ms:3600000}")
    public void refreshWishlistPrices() {
        try {
            WishlistPriceRefreshSummary summary =
                    priceRefreshService.refreshActiveWishlistAlerts();
            LOGGER.info("Wishlist price refresh completed: {}", summary);
        } catch (Exception exception) {
            LOGGER.error("Wishlist price refresh failed", exception);
        }
    }
}
