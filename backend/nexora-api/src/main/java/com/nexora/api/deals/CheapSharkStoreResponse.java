package com.nexora.api.deals;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CheapSharkStoreResponse(
        String storeID,
        String storeName,
        Object isActive
) {
}
