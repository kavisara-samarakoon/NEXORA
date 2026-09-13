package com.nexora.api.deals;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.IntStream;

@Component
public class CheapSharkDealMapper {

    private static final BigDecimal ZERO = BigDecimal.ZERO;
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
                .mapToObj(index -> toDealIfValid(
                        responses.get(index),
                        index + 1L,
                        storeLookup))
                .filter(Objects::nonNull)
                .toList();
    }

    private Deal toDealIfValid(
            CheapSharkDealResponse response,
            long id,
            Map<String, String> storeLookup) {
        try {
            return toDeal(response, id, storeLookup);
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    Deal toDeal(CheapSharkDealResponse response, long id, Map<String, String> storeLookup) {
        if (response == null || response.title() == null || response.title().isBlank()) {
            throw new IllegalArgumentException("CheapShark deal title is missing");
        }

        BigDecimal salePrice = providerPrice(response.salePrice()).setScale(2, RoundingMode.HALF_UP);
        BigDecimal normalPrice = providerPrice(response.normalPrice()).setScale(2, RoundingMode.HALF_UP);
        int discountValue = discountValue(response.savings());
        BigDecimal rating = rating(response.steamRatingPercent());

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
                status(discountValue, salePrice),
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

    private static BigDecimal rating(String steamRatingPercent) {
        BigDecimal steamRating = nullableDecimal(steamRatingPercent);
        if (steamRating == null || steamRating.signum() <= 0) return ZERO.setScale(1);

        return steamRating.min(ONE_HUNDRED)
                .divide(new BigDecimal("20"), 1, RoundingMode.HALF_UP);
    }

    private static BigDecimal providerPrice(String value) {
        BigDecimal parsed = nullableDecimal(value);
        if (parsed == null || parsed.signum() < 0) {
            throw new IllegalArgumentException("CheapShark deal price is invalid");
        }
        return parsed;
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

    private static String status(int discountValue, BigDecimal salePrice) {
        if (salePrice.signum() == 0) return "Free offer";
        if (discountValue >= 80) return "Deep discount";
        if (discountValue >= 60) return "Strong discount";
        if (discountValue >= 30) return "Current offer";
        return "Observed offer";
    }
}
