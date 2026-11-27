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
        WishlistAlertEvaluation alertEvaluation,
        String externalGameId,
        String externalDealId,
        String currency,
        String thumbUrl,
        String priceSource,
        String lowestEverSource
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
            String priority,
            WishlistAlertEvaluation alertEvaluation) {
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
                alertEvaluation,
                null,
                null,
                WishlistPriceParser.establishStoredCurrency(currentPrice, targetPrice, null),
                null,
                "unverified",
                "unverified"
        );
    }

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
            String priority,
            WishlistAlertEvaluation alertEvaluation,
            String externalGameId,
            String externalDealId,
            String currency,
            String thumbUrl) {
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
                alertEvaluation,
                externalGameId,
                externalDealId,
                currency,
                thumbUrl,
                "unverified",
                "unverified"
        );
    }
}
