package com.nexora.api.wishlist;

import java.util.List;

public interface UserWishlistService {

    List<WishlistItem> getWishlistItems(long userId);

    WishlistItem addWishlistItem(long userId, AddWishlistItemRequest request);

    WishlistItem updateWishlistAlert(long userId, long itemId, UpdateWishlistAlertRequest request);

    void deleteWishlistItem(long userId, long itemId);
}
