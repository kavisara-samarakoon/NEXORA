package com.nexora.api.giveaways;

import java.time.Instant;

public record LiveGiveaway(
        long id,
        String title,
        String description,
        String instructions,
        String worth,
        String thumbnailUrl,
        String imageUrl,
        String platformLabel,
        String rawPlatforms,
        String type,
        String status,
        Instant publishedAtUtc,
        Instant endsAtUtc,
        Integer daysRemaining,
        String claimUrl,
        String source,
        String sourceAttribution
) {
}
