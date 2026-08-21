package com.nexora.api.wishlist;

import com.nexora.api.wishlist.persistence.WishlistItem;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@Profile("dev")
public class StoredWishlistPriceSnapshotProvider implements WishlistPriceSnapshotProvider {

    @Override
    public Optional<String> findCurrentPrice(WishlistItem item) {
        // Placeholder until a real external price snapshot provider is integrated.
        return Optional.ofNullable(item.getCurrentPrice());
    }
}
