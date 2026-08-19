package com.nexora.api.deals;

import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

@Component
public class CheapSharkDealMapper {

    private static final BigDecimal ZERO = BigDecimal.ZERO;
    private static final BigDecimal FIVE = new BigDecimal("5");
    private static final BigDecimal TEN = new BigDecimal("10");
    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");

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
                status(discountValue)
        );
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
