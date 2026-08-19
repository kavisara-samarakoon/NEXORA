package com.nexora.api.wishlist;

public class WishlistItemNotFoundException extends RuntimeException {

    public WishlistItemNotFoundException() {
        super("Wishlist item was not found");
    }
}
