package com.nexora.api.deals;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CheapSharkDealResponse(
        String title,
        String storeID,
        String salePrice,
        String normalPrice,
        String savings,
        String steamRatingPercent,
        String dealRating,
        String dealID
) {
}
