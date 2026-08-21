package com.nexora.api.wishlist;

import com.nexora.api.wishlist.persistence.WishlistItem;

import java.util.Optional;

public class StoredWishlistPriceSnapshotProvider implements WishlistPriceSnapshotProvider {

    @Override
    public Optional<String> findCurrentPrice(WishlistItem item) {
        // Safe default: retain the stored value without making an external request.
        return Optional.ofNullable(item.getCurrentPrice());
    }
}
