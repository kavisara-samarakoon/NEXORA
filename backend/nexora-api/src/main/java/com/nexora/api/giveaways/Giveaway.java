package com.nexora.api.giveaways;

public record Giveaway(
        long id,
        String platform,
        String platformLabel,
        String title,
        String genre,
        String timer,
        int daysRemaining,
        int claimed,
        String status,
        String tag,
        String originalPrice
) {
}

