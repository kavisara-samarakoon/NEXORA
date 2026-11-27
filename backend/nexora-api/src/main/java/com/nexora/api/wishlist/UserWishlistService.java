package com.nexora.api.wishlist;

import java.util.List;

public interface UserWishlistService {

    List<WishlistItem> getWishlistItems(long userId);

    List<WishlistAlertEventResponse> getWishlistAlertEvents(long userId);

    List<WishlistPriceHistoryPoint> getWishlistPriceHistory(
            long userId, long itemId, int limit);

    WishlistItem addWishlistItem(long userId, AddWishlistItemRequest request);

    WishlistItem updateWishlistAlert(long userId, long itemId, UpdateWishlistAlertRequest request);

    void deleteWishlistItem(long userId, long itemId);

    UserWishlistRefreshResponse refreshWishlistPrices(long userId);

    default UserWishlistRefreshResponse refreshWishlistPrices(long userId, Long cursor) {
        return refreshWishlistPrices(userId);
    }
}
