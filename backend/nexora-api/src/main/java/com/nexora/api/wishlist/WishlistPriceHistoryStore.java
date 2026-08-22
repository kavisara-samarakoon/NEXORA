package com.nexora.api.wishlist;

import java.util.List;
import java.util.Optional;

public interface WishlistPriceHistoryStore {

    void save(NewWishlistPriceHistoryEntry entry);

    Optional<WishlistPriceHistoryPoint> findLatest(long userId, long wishlistItemId);

    List<WishlistPriceHistoryPoint> findRecent(long userId, long wishlistItemId, int limit);
}
