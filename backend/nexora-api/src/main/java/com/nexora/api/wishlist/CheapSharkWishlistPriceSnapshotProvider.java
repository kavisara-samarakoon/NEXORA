package com.nexora.api.wishlist;

import com.nexora.api.deals.CheapSharkDealClient;
import com.nexora.api.deals.CheapSharkDealResponse;
import com.nexora.api.deals.CheapSharkStoreDirectory;
import com.nexora.api.deals.ExternalProviderRequestBudget;
import com.nexora.api.wishlist.persistence.WishlistItem;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Supplier;

public class CheapSharkWishlistPriceSnapshotProvider
        implements WishlistPriceSnapshotProvider {

    private static final Logger LOGGER =
            LoggerFactory.getLogger(CheapSharkWishlistPriceSnapshotProvider.class);

    private final CheapSharkDealClient cheapSharkDealClient;
    private final CheapSharkStoreDirectory cheapSharkStoreDirectory;
    private final WishlistPriceRefreshProperties properties;
    private final ExternalProviderRequestBudget requestBudget;

    public CheapSharkWishlistPriceSnapshotProvider(
            CheapSharkDealClient cheapSharkDealClient,
            CheapSharkStoreDirectory cheapSharkStoreDirectory,
            WishlistPriceRefreshProperties properties) {
        this(cheapSharkDealClient, cheapSharkStoreDirectory, properties, null);
    }

    public CheapSharkWishlistPriceSnapshotProvider(
            CheapSharkDealClient cheapSharkDealClient,
            CheapSharkStoreDirectory cheapSharkStoreDirectory,
            WishlistPriceRefreshProperties properties,
            ExternalProviderRequestBudget requestBudget) {
        this.cheapSharkDealClient = cheapSharkDealClient;
        this.cheapSharkStoreDirectory = cheapSharkStoreDirectory;
        this.properties = properties;
        this.requestBudget = requestBudget;
    }

    @Override
    public Optional<String> findCurrentPrice(WishlistItem item) {
        return findVerifiedOffer(item).map(CheapSharkWishlistLiveLookup.ObservedOffer::priceLabel);
    }

    @Override
    public Optional<CheapSharkWishlistLiveLookup.ObservedOffer> findVerifiedOffer(WishlistItem item) {
        if (item == null || isBlank(item.getTitle()) || isBlank(item.getStore())
                || !properties.getCheapshark().isMatchStore()
                || !WishlistRefreshSupport.isUsdEligible(item.getCurrency())) {
            return Optional.empty();
        }

        List<CheapSharkDealResponse> responses;
        try {
            responses = executeWithBudget(() -> cheapSharkDealClient.getDeals(
                    properties.getCheapshark().getPageSize(),
                    item.getTitle().trim(),
                    null
            ));
        } catch (RuntimeException exception) {
            LOGGER.warn(
                    "CheapShark wishlist price lookup failed for item {} ({})",
                    item.getId(),
                    exception.getMessage()
            );
            return Optional.empty();
        }

        return CheapSharkWishlistLiveLookup.matchOffer(
                item.getTitle(), item.getStore(), item.getExternalGameId(), responses,
                () -> storeLookup(item));
    }

    @Override
    public String priceHistorySource() {
        return WishlistRefreshSupport.SCHEDULED_SOURCE;
    }

    private Map<String, String> storeLookup(WishlistItem item) {
        try {
            return cheapSharkStoreDirectory.toLookup(
                    executeWithBudget(cheapSharkDealClient::getStores));
        } catch (RuntimeException exception) {
            LOGGER.warn("CheapShark store lookup failed for wishlist item {} ({})",
                    item.getId(), exception.getMessage());
            return Map.of();
        }
    }

    private <T> T executeWithBudget(Supplier<T> supplier) {
        return requestBudget == null ? supplier.get() : requestBudget.execute(supplier);
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
