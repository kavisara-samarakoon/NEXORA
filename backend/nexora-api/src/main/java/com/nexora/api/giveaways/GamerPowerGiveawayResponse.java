package com.nexora.api.giveaways;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record GamerPowerGiveawayResponse(
        Long id,
        String title,
        String worth,
        String thumbnail,
        String image,
        String description,
        String instructions,
        @JsonProperty("open_giveaway_url") String openGiveawayUrl,
        @JsonProperty("published_date") String publishedDate,
        String type,
        String platforms,
        @JsonProperty("end_date") String endDate,
        Integer users,
        String status,
        @JsonProperty("gamerpower_url") String gamerpowerUrl,
        @JsonProperty("open_giveaway") String openGiveaway
) {
}
