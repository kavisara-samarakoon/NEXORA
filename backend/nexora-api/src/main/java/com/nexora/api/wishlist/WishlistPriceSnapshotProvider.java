package com.nexora.api.wishlist;

import com.nexora.api.wishlist.persistence.WishlistItem;

import java.util.Optional;

public interface WishlistPriceSnapshotProvider {

    Optional<String> findCurrentPrice(WishlistItem item);

    default Optional<CheapSharkWishlistLiveLookup.ObservedOffer> findVerifiedOffer(WishlistItem item) {
        return Optional.empty();
    }

    default String priceHistorySource() {
        return "price-refresh";
    }
}
