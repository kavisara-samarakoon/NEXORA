package com.nexora.api.wishlist;

public record WishlistItem(
        long id,
        String title,
        String store,
        String currentPrice,
        String targetPrice,
        String lowestEver,
        String discount,
        String status,
        boolean alertActive,
        String priority,
        WishlistAlertEvaluation alertEvaluation
) {

    public WishlistItem(
            long id,
            String title,
            String store,
            String currentPrice,
            String targetPrice,
            String lowestEver,
            String discount,
            String status,
            boolean alertActive,
            String priority) {
        this(
                id,
                title,
                store,
                currentPrice,
                targetPrice,
                lowestEver,
                discount,
                status,
                alertActive,
                priority,
                WishlistAlertEvaluator.evaluate(currentPrice, targetPrice, alertActive)
        );
    }
}
