package com.nexora.api.wishlist;

import com.nexora.api.deals.CheapSharkDealClient;
import com.nexora.api.deals.CheapSharkStoreDirectory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
public class WishlistPriceSnapshotProviderConfiguration {

    @Bean
    @ConditionalOnExpression(
            "'${nexora.wishlist.price-refresh.provider:stored}' == 'cheapshark' "
                    + "or ${nexora.wishlist.price-refresh.cheapshark.enabled:false}"
    )
    @ConditionalOnMissingBean(WishlistPriceSnapshotProvider.class)
    WishlistPriceSnapshotProvider cheapSharkWishlistPriceSnapshotProvider(
            CheapSharkDealClient cheapSharkDealClient,
            CheapSharkStoreDirectory cheapSharkStoreDirectory,
            WishlistPriceRefreshProperties properties) {
        return new CheapSharkWishlistPriceSnapshotProvider(
                cheapSharkDealClient,
                cheapSharkStoreDirectory,
                properties
        );
    }

    @Bean
    @ConditionalOnExpression(
            "'${nexora.wishlist.price-refresh.provider:stored}' != 'cheapshark' "
                    + "and ${nexora.wishlist.price-refresh.cheapshark.enabled:false} == false"
    )
    @ConditionalOnMissingBean(WishlistPriceSnapshotProvider.class)
    WishlistPriceSnapshotProvider storedWishlistPriceSnapshotProvider() {
        return new StoredWishlistPriceSnapshotProvider();
    }
}
