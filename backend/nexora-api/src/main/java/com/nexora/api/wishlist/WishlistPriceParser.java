package com.nexora.api.wishlist;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Currency;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

final class WishlistPriceParser {

    static final String UNKNOWN_CURRENCY = "UNKNOWN";
    private static final Pattern NUMERIC_PRICE = Pattern.compile(
            "(?:\\d+|\\d{1,3}(?:,\\d{3})+)(?:\\.\\d+)?");
    private static final int MAX_INTEGER_DIGITS = 10;

    private WishlistPriceParser() {
    }

    static Optional<ParsedPrice> parse(String value, String fallbackCurrency) {
        if (value == null) {
            return Optional.empty();
        }

        String normalized = value.trim();
        if (normalized.isEmpty()) {
            return Optional.empty();
        }
        String currency = isKnownCurrency(fallbackCurrency)
                ? fallbackCurrency.trim().toUpperCase(Locale.ROOT)
                : null;
        if (normalized.equalsIgnoreCase("FREE")) {
            return Optional.of(new ParsedPrice(new BigDecimal("0.00"), currency));
        }

        Optional<String> explicit = detectExplicitCurrency(normalized);
        if (currency == null || (explicit.isPresent() && !explicit.get().equals(currency))) {
            return Optional.empty();
        }
        String numericPart = stripCurrencyToken(normalized);

        if (!NUMERIC_PRICE.matcher(numericPart).matches()) {
            return Optional.empty();
        }

        try {
            BigDecimal amount = new BigDecimal(numericPart.replace(",", ""))
                    .setScale(2, RoundingMode.HALF_UP);
            int integerDigits = Math.max(0, amount.precision() - amount.scale());
            if (amount.signum() < 0 || integerDigits > MAX_INTEGER_DIGITS) {
                return Optional.empty();
            }
            return Optional.of(new ParsedPrice(amount, currency));
        } catch (NumberFormatException exception) {
            return Optional.empty();
        }
    }

    static Optional<String> detectExplicitCurrency(String value) {
        if (value == null) {
            return Optional.empty();
        }
        String normalized = value.trim();
        if (normalized.isEmpty() || normalized.equalsIgnoreCase("FREE")) {
            return Optional.empty();
        }
        String upper = normalized.toUpperCase(Locale.ROOT);
        if (normalized.startsWith("€")) {
            return Optional.of("EUR");
        }
        if (normalized.startsWith("£")) {
            return Optional.of("GBP");
        }
        if (normalized.startsWith("$") || normalized.endsWith("$")) {
            return Optional.of("USD");
        }
        if (upper.length() > 4 && upper.charAt(3) == ' ' && isKnownCurrency(upper.substring(0, 3))) {
            return Optional.of(upper.substring(0, 3));
        }
        return Optional.empty();
    }

    static String resolveCurrency(String currentPrice, String targetPrice, String requestedCurrency) {
        Optional<String> explicitCurrent = detectExplicitCurrency(currentPrice);
        Optional<String> explicitTarget = detectExplicitCurrency(targetPrice);
        boolean isFree = currentPrice != null && "FREE".equalsIgnoreCase(currentPrice.trim());

        if (requestedCurrency != null && !requestedCurrency.isBlank()) {
            String normalizedRequested = requestedCurrency.trim().toUpperCase(Locale.ROOT);
            if (isKnownCurrency(normalizedRequested)) {
                if (explicitCurrent.isPresent() && !explicitCurrent.get().equals(normalizedRequested)) {
                    throw new IllegalArgumentException(
                            "Currency does not match the current price currency.");
                }
                if (isFree && explicitTarget.isPresent() && !explicitTarget.get().equals(normalizedRequested)) {
                    throw new IllegalArgumentException(
                            "Currency does not match the target price currency.");
                }
                return normalizedRequested;
            }
            return UNKNOWN_CURRENCY;
        }

        if (explicitCurrent.isPresent()) {
            return explicitCurrent.get();
        }
        if (isFree && explicitTarget.isPresent()) {
            return explicitTarget.get();
        }
        return UNKNOWN_CURRENCY;
    }

    static String establishStoredCurrency(String currentPrice, String targetPrice, String storedCurrency) {
        if (storedCurrency == null || storedCurrency.isBlank()) {
            return resolveCurrency(currentPrice, targetPrice, null);
        }
        return isKnownCurrency(storedCurrency)
                ? storedCurrency.trim().toUpperCase(Locale.ROOT)
                : UNKNOWN_CURRENCY;
    }

    static boolean isKnownCurrency(String currency) {
        if (currency == null || currency.isBlank()) {
            return false;
        }
        try {
            return !"XXX".equals(Currency.getInstance(currency.trim().toUpperCase(Locale.ROOT)).getCurrencyCode());
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private static String stripCurrencyToken(String normalized) {
        String upper = normalized.toUpperCase(Locale.ROOT);
        if (normalized.startsWith("€") || normalized.startsWith("£") || normalized.startsWith("$")) {
            return normalized.substring(1).trim();
        }
        if (upper.length() > 4 && upper.charAt(3) == ' ' && isKnownCurrency(upper.substring(0, 3))) {
            return normalized.substring(4).trim();
        }
        if (normalized.endsWith("$")) {
            return normalized.substring(0, normalized.length() - 1).trim();
        }
        return normalized;
    }

    record ParsedPrice(BigDecimal amount, String currency) {
    }
}
