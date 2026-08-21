package com.nexora.api.wishlist;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.regex.Pattern;

public final class WishlistAlertEvaluator {

    private static final Pattern NUMERIC_PRICE = Pattern.compile(
            "(?:\\d+|\\d{1,3}(?:,\\d{3})+)(?:\\.\\d+)?");

    private WishlistAlertEvaluator() {
    }

    public static WishlistAlertEvaluation evaluate(
            String currentPrice, String targetPrice, boolean alertActive) {
        if (!alertActive) {
            return new WishlistAlertEvaluation(false, "paused", "Alert is paused.");
        }

        Optional<BigDecimal> current = parsePrice(currentPrice);
        Optional<BigDecimal> target = parsePrice(targetPrice);
        if (current.isEmpty() || target.isEmpty()) {
            return new WishlistAlertEvaluation(
                    false,
                    "not-evaluable",
                    "Price cannot be evaluated yet."
            );
        }

        if (current.get().compareTo(target.get()) <= 0) {
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

    private static Optional<BigDecimal> parsePrice(String value) {
        if (value == null) return Optional.empty();

        String normalized = value.trim();
        if (normalized.isEmpty()) return Optional.empty();
        if (normalized.equalsIgnoreCase("FREE")) return Optional.of(BigDecimal.ZERO);
        if (normalized.startsWith("$")) {
            normalized = normalized.substring(1);
        } else if (normalized.endsWith("$")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        if (!NUMERIC_PRICE.matcher(normalized).matches()) return Optional.empty();

        try {
            BigDecimal price = new BigDecimal(normalized.replace(",", ""));
            return price.signum() < 0 ? Optional.empty() : Optional.of(price);
        } catch (NumberFormatException exception) {
            return Optional.empty();
        }
    }
}
