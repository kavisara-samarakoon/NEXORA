package com.nexora.api.giveaways;

import java.time.Instant;
import java.util.List;

public record LiveGiveawaysResponse(
        List<LiveGiveaway> giveaways,
        String source,
        String sourceAttribution,
        String sourceUrl,
        String cacheState,
        Instant lastRefreshedAtUtc,
        String notice
) {
}
