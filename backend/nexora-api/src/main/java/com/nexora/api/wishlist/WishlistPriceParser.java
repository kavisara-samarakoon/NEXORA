package com.nexora.api.wishlist;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;
import java.util.regex.Pattern;

final class WishlistPriceParser {

    private static final Pattern NUMERIC_PRICE = Pattern.compile(
            "(?:\\d+|\\d{1,3}(?:,\\d{3})+)(?:\\.\\d+)?");
    private static final int MAX_INTEGER_DIGITS = 10;

    private WishlistPriceParser() {
    }

    static Optional<ParsedPrice> parse(String value) {
        if (value == null) {
            return Optional.empty();
        }

        String normalized = value.trim();
        if (normalized.isEmpty()) {
            return Optional.empty();
        }
        if (normalized.equalsIgnoreCase("FREE")) {
            return Optional.of(new ParsedPrice(new BigDecimal("0.00"), "USD"));
        }
        if (normalized.startsWith("$")) {
            normalized = normalized.substring(1);
        } else if (normalized.endsWith("$")) {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        if (!NUMERIC_PRICE.matcher(normalized).matches()) {
            return Optional.empty();
        }

        try {
            BigDecimal amount = new BigDecimal(normalized.replace(",", ""))
                    .setScale(2, RoundingMode.HALF_UP);
            int integerDigits = Math.max(0, amount.precision() - amount.scale());
            if (amount.signum() < 0 || integerDigits > MAX_INTEGER_DIGITS) {
                return Optional.empty();
            }
            return Optional.of(new ParsedPrice(amount, "USD"));
        } catch (NumberFormatException exception) {
            return Optional.empty();
        }
    }

    record ParsedPrice(BigDecimal amount, String currency) {
    }
}
