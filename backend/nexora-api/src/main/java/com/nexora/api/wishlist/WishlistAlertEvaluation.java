package com.nexora.api.wishlist;

public record WishlistAlertEvaluation(
        boolean targetReached,
        String state,
        String message
) {
}
