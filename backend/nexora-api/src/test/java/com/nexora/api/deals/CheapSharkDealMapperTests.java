package com.nexora.api.deals;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;

class CheapSharkDealMapperTests {

    private final CheapSharkDealMapper mapper = new CheapSharkDealMapper();

    @Test
    void handlesInvalidAndMissingNumericFieldsSafely() {
        List<Deal> deals = mapper.toDeals(List.of(
                response("Invalid numbers", "99", "not-a-price", "-20", "unknown", "bad", "8.4"),
                response("Missing numbers", "25", null, null, null, null, null)
        ));

        Deal invalidNumbers = deals.get(0);
        Deal missingNumbers = deals.get(1);
        assertAll(
                () -> assertEquals(1L, invalidNumbers.id()),
                () -> assertEquals("Store 99", invalidNumbers.store()),
                () -> assertEquals("-0%", invalidNumbers.discount()),
                () -> assertEquals(0, invalidNumbers.discountValue()),
                () -> assertEquals("$0.00", invalidNumbers.priceOld()),
                () -> assertEquals("FREE", invalidNumbers.priceNew()),
                () -> assertEquals(new BigDecimal("0.00"), invalidNumbers.priceValue()),
                () -> assertEquals(new BigDecimal("4.2"), invalidNumbers.rating()),
                () -> assertEquals("★★★★☆", invalidNumbers.stars()),
                () -> assertEquals("Average", invalidNumbers.status()),
                () -> assertEquals(2L, missingNumbers.id()),
                () -> assertEquals("Epic Games", missingNumbers.store()),
                () -> assertEquals(new BigDecimal("0.0"), missingNumbers.rating())
        );
    }

    @Test
    void roundsAndClampsSavingsAndRatings() {
        Deal deal = mapper.toDeals(List.of(
                response("Clamped", "1", "0", "59.999", "250.6", "120", "10")
        )).get(0);

        assertAll(
                () -> assertEquals("-100%", deal.discount()),
                () -> assertEquals(100, deal.discountValue()),
                () -> assertEquals("$60.00", deal.priceOld()),
                () -> assertEquals("FREE", deal.priceNew()),
                () -> assertEquals(new BigDecimal("5.0"), deal.rating()),
                () -> assertEquals("★★★★★", deal.stars()),
                () -> assertEquals("Lowest Ever", deal.status())
        );
    }

    private static CheapSharkDealResponse response(
            String title,
            String storeId,
            String salePrice,
            String normalPrice,
            String savings,
            String steamRatingPercent,
            String dealRating) {
        return new CheapSharkDealResponse(
                title,
                storeId,
                salePrice,
                normalPrice,
                savings,
                steamRatingPercent,
                dealRating
        );
    }
}
