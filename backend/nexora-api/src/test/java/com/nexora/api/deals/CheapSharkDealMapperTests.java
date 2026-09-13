package com.nexora.api.deals;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CheapSharkDealMapperTests {

    private final CheapSharkDealMapper mapper = new CheapSharkDealMapper(
            new CheapSharkStoreDirectory()
    );

    @Test
    void omitsMalformedProviderPrices() {
        assertTrue(mapper.toDeals(List.of(
                response("Malformed sale", "1", "not-a-price", "20", "50", null, null, null),
                response("Malformed reference", "1", "10", "NaN", "50", null, null, null)
        ), Map.of()).isEmpty());
    }

    @Test
    void omitsMissingProviderPrices() {
        assertTrue(mapper.toDeals(List.of(
                response("Missing sale", "1", null, "20", "50", null, null, null),
                response("Missing reference", "1", "10", null, "50", null, null, null)
        ), Map.of()).isEmpty());
    }

    @Test
    void omitsNegativeProviderPrices() {
        assertTrue(mapper.toDeals(List.of(
                response("Negative sale", "1", "-1", "20", "50", null, null, null),
                response("Negative reference", "1", "10", "-20", "50", null, null, null)
        ), Map.of()).isEmpty());
    }

    @Test
    void mapsExplicitZeroProviderPriceAsFree() {
        Deal deal = mapper.toDeals(List.of(
                response("Explicitly free", "1", "0", "59.999", "100", "100", null, "free")
        ), Map.of("1", "Steam")).get(0);

        assertAll(
                () -> assertEquals("$60.00", deal.priceOld()),
                () -> assertEquals("FREE", deal.priceNew()),
                () -> assertEquals(new BigDecimal("0.00"), deal.priceValue()),
                () -> assertEquals("Free offer", deal.status())
        );
    }

    @Test
    void highDiscountDoesNotClaimHistoricalLow() {
        Deal deal = mapper.toDeals(List.of(
                response("Clamped", "1", "2.99", "59.999", "250.6", "120", "10", "encoded%2Fdeal")
        ), Map.of("1", "Steam")).get(0);

        assertAll(
                () -> assertEquals("-100%", deal.discount()),
                () -> assertEquals(100, deal.discountValue()),
                () -> assertEquals("$60.00", deal.priceOld()),
                () -> assertEquals("$2.99", deal.priceNew()),
                () -> assertEquals(new BigDecimal("5.0"), deal.rating()),
                () -> assertEquals("★★★★★", deal.stars()),
                () -> assertEquals("Deep discount", deal.status()),
                () -> assertEquals(
                        "https://www.cheapshark.com/redirect?dealID=encoded%2Fdeal",
                        deal.dealUrl())
        );
    }

    @Test
    void doesNotPresentMissingOrZeroRatingsAsStars() {
        List<Deal> deals = mapper.toDeals(List.of(
                response("Missing rating", "1", "5", "10", "50", null, "8.4", null),
                response("Zero rating", "1", "5", "10", "50", "0", "8.4", null)
        ), Map.of());

        for (Deal deal : deals) {
            assertAll(
                    () -> assertEquals(new BigDecimal("0.0"), deal.rating()),
                    () -> assertEquals("", deal.stars())
            );
        }
    }

    @Test
    void mapsBlankStoreIdToUnknownStore() {
        Deal deal = mapper.toDeals(List.of(
                response("Unknown store", "  ", "1", "2", "50", null, null, "raw deal&offer")
        ), Map.of()).get(0);

        assertAll(
                () -> assertEquals("Unknown Store", deal.store()),
                () -> assertEquals(
                        "https://www.cheapshark.com/redirect?dealID=raw%20deal%26offer",
                        deal.dealUrl())
        );
    }

    private static CheapSharkDealResponse response(
            String title,
            String storeId,
            String salePrice,
            String normalPrice,
            String savings,
            String steamRatingPercent,
            String dealRating,
            String dealId) {
        return new CheapSharkDealResponse(
                title,
                storeId,
                salePrice,
                normalPrice,
                savings,
                steamRatingPercent,
                dealRating,
                dealId
        );
    }
}
