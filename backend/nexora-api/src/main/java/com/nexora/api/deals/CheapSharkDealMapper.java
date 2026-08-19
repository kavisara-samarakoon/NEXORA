package com.nexora.api.deals;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

@Component
public class CheapSharkDealMapper {

    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private static final BigDecimal FIVE = new BigDecimal("5");
    private static final BigDecimal TEN = new BigDecimal("10");
    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");
    private static final String CHEAPSHARK_REDIRECT_URL =
            "https://www.cheapshark.com/redirect?dealID=";
    private static final char[] HEX = "0123456789ABCDEF".toCharArray();

    private final CheapSharkStoreDirectory storeDirectory;

    public CheapSharkDealMapper(CheapSharkStoreDirectory storeDirectory) {
        this.storeDirectory = storeDirectory;
    }

    public List<Deal> toDeals(
            List<CheapSharkDealResponse> responses,
            Map<String, String> storeLookup) {
        if (responses == null) {
            throw new IllegalArgumentException("CheapShark response list is missing");
        }

        return IntStream.range(0, responses.size())
                .mapToObj(index -> toDeal(responses.get(index), index + 1L, storeLookup))
                .toList();
    }

    Deal toDeal(CheapSharkDealResponse response, long id, Map<String, String> storeLookup) {
        if (response == null || response.title() == null || response.title().isBlank()) {
            throw new IllegalArgumentException("CheapShark deal title is missing");
        }

        BigDecimal salePrice = nonNegativeDecimal(response.salePrice()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal normalPrice = nonNegativeDecimal(response.normalPrice()).setScale(2, RoundingMode.HALF_UP);
        int discountValue = discountValue(response.savings());
        BigDecimal rating = rating(response.steamRatingPercent(), response.dealRating());

        return new Deal(
                id,
                storeDirectory.storeName(storeLookup, response.storeID()),
                "-" + discountValue + "%",
                discountValue,
                response.title().trim(),
                money(normalPrice),
                salePrice.signum() == 0 ? "FREE" : money(salePrice),
                salePrice,
                rating,
                DatabaseDealService.starsFor(rating),
                "External Deal",
                status(discountValue),
                dealUrl(response.dealID())
        );
    }

    static String dealUrl(String dealId) {
        if (dealId == null || dealId.isBlank()) return null;
        return CHEAPSHARK_REDIRECT_URL + encodeDealId(dealId.trim());
    }

    private static String encodeDealId(String dealId) {
        StringBuilder encoded = new StringBuilder(dealId.length());
        for (int index = 0; index < dealId.length();) {
            char character = dealId.charAt(index);
            if (character == '%' && index + 2 < dealId.length()
                    && isHex(dealId.charAt(index + 1))
                    && isHex(dealId.charAt(index + 2))) {
                encoded.append(dealId, index, index + 3);
                index += 3;
                continue;
            }

            int codePoint = dealId.codePointAt(index);
            if (isUnreserved(codePoint)) {
                encoded.appendCodePoint(codePoint);
            } else {
                byte[] bytes = new String(Character.toChars(codePoint))
                        .getBytes(StandardCharsets.UTF_8);
                for (byte value : bytes) {
                    int unsigned = value & 0xff;
                    encoded.append('%')
                            .append(HEX[unsigned >>> 4])
                            .append(HEX[unsigned & 0x0f]);
                }
            }
            index += Character.charCount(codePoint);
        }
        return encoded.toString();
    }

    private static boolean isUnreserved(int codePoint) {
        return codePoint >= 'a' && codePoint <= 'z'
                || codePoint >= 'A' && codePoint <= 'Z'
                || codePoint >= '0' && codePoint <= '9'
                || codePoint == '-'
                || codePoint == '.'
                || codePoint == '_'
                || codePoint == '~';
    }

    private static boolean isHex(char character) {
        return character >= '0' && character <= '9'
                || character >= 'a' && character <= 'f'
                || character >= 'A' && character <= 'F';
    }

    private static int discountValue(String savings) {
        BigDecimal value = nullableDecimal(savings);
        if (value == null) return 0;

        return value.max(ZERO)
                .min(ONE_HUNDRED)
                .setScale(0, RoundingMode.HALF_UP)
                .intValue();
    }

    private static BigDecimal rating(String steamRatingPercent, String dealRating) {
        BigDecimal steamRating = nullableDecimal(steamRatingPercent);
        if (steamRating != null) {
            return steamRating.max(ZERO)
                    .min(ONE_HUNDRED)
                    .divide(new BigDecimal("20"), 1, RoundingMode.HALF_UP);
        }

        BigDecimal externalDealRating = nullableDecimal(dealRating);
        if (externalDealRating != null) {
            return externalDealRating.max(ZERO)
                    .min(TEN)
                    .divide(new BigDecimal("2"), 1, RoundingMode.HALF_UP)
                    .min(FIVE);
        }
        return ZERO.setScale(1);
    }

    private static BigDecimal nonNegativeDecimal(String value) {
        BigDecimal parsed = nullableDecimal(value);
        return parsed == null ? ZERO : parsed.max(ZERO);
    }

    private static BigDecimal nullableDecimal(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return new BigDecimal(value.trim());
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private static String money(BigDecimal value) {
        return "$" + value.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    private static String status(int discountValue) {
        if (discountValue >= 80) return "Lowest Ever";
        if (discountValue >= 60) return "Great Deal";
        if (discountValue >= 30) return "Good Price";
        return "Average";
    }
}
