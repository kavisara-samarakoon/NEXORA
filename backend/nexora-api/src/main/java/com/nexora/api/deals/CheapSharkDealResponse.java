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
        String dealID,
        String gameID,
        String steamAppID,
        String thumb,
        String metacriticScore,
        Long lastChange
) {

    public CheapSharkDealResponse(
            String title,
            String storeID,
            String salePrice,
            String normalPrice,
            String savings,
            String steamRatingPercent,
            String dealRating,
            String dealID) {
        this(
                title,
                storeID,
                salePrice,
                normalPrice,
                savings,
                steamRatingPercent,
                dealRating,
                dealID,
                null,
                null,
                null,
                null,
                null
        );
    }
}
