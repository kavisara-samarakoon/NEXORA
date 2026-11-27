package com.nexora.api.deals;

import java.time.Instant;
import java.util.List;

public record ExternalDealsCatalogResponse(
        List<Deal> deals,
        String source,
        String sourceAttribution,
        String sourceUrl,
        String currency,
        String cacheState,
        Instant lastRefreshedAtUtc,
        List<DealStoreOption> availableStores,
        String notice
) {
}
