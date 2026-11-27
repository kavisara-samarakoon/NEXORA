package com.nexora.api.wishlist;

import java.util.Optional;

public final class WishlistAlertEvaluator {

    private WishlistAlertEvaluator() {
    }

    public static WishlistAlertEvaluation evaluate(
            String currentPrice, String targetPrice, boolean alertActive) {
        return evaluate(currentPrice, targetPrice, alertActive,
                WishlistPriceParser.resolveCurrency(currentPrice, targetPrice, null));
    }

    public static WishlistAlertEvaluation evaluate(
            String currentPrice,
            String targetPrice,
            boolean alertActive,
            String itemCurrency) {
        if (!alertActive) {
            return new WishlistAlertEvaluation(false, "paused", "Alert is paused.");
        }

        if (WishlistPriceParser.isKnownCurrency(itemCurrency)) {
            String currentCurrency = WishlistPriceParser.detectExplicitCurrency(currentPrice).orElse(itemCurrency);
            String targetCurrency = WishlistPriceParser.detectExplicitCurrency(targetPrice).orElse(itemCurrency);
            if (!currentCurrency.equalsIgnoreCase(itemCurrency) || !targetCurrency.equalsIgnoreCase(itemCurrency)) {
                return new WishlistAlertEvaluation(false, "not-evaluable",
                        "Cannot compare incompatible currencies (" + currentCurrency + " vs " + targetCurrency
                                + (currentCurrency.equalsIgnoreCase(targetCurrency) ? "; item uses " + itemCurrency : "")
                                + ").");
            }
        }

        Optional<WishlistPriceParser.ParsedPrice> current =
                WishlistPriceParser.parse(currentPrice, itemCurrency);
        Optional<WishlistPriceParser.ParsedPrice> target =
                WishlistPriceParser.parse(targetPrice, itemCurrency);
        if (current.isEmpty() || target.isEmpty()) {
            return new WishlistAlertEvaluation(
                    false,
                    "not-evaluable",
                    "Price cannot be evaluated yet."
            );
        }

        WishlistPriceParser.ParsedPrice currentParsed = current.get();
        WishlistPriceParser.ParsedPrice targetParsed = target.get();
        if (currentParsed.amount().compareTo(targetParsed.amount()) <= 0) {
            return new WishlistAlertEvaluation(
                    true,
                    "target-reached",
                    "Target price reached."
            );
        }

        return new WishlistAlertEvaluation(
                false,
                "watching",
                "Still above target price."
        );
    }
}
