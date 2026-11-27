package com.nexora.api.giveaways;

import jakarta.validation.constraints.Pattern;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Validated
@RestController
@RequestMapping("/api/giveaways")
public class GiveawayController {

    private final GiveawayCatalogService giveawayService;
    private final LiveGiveawayService liveGiveawayService;

    public GiveawayController(
            GiveawayCatalogService giveawayService,
            LiveGiveawayService liveGiveawayService) {
        this.giveawayService = giveawayService;
        this.liveGiveawayService = liveGiveawayService;
    }

    @GetMapping
    public List<Giveaway> getGiveaways() {
        return giveawayService.getGiveaways();
    }

    @GetMapping("/live")
    public LiveGiveawaysResponse getLiveGiveaways(
            @RequestParam(required = false) @Pattern(
                    regexp = "^(pc|steam|epic-games-store|gog|itchio|ps4|ps5|xbox-one|xbox-series-xs|switch|android|ios|vr|drm-free)$",
                    message = "must be a supported GamerPower platform identifier")
            String platform,
            @RequestParam(required = false) @Pattern(
                    regexp = "^(game|loot|beta)$",
                    message = "must be one of: game, loot, beta")
            String type) {
        return liveGiveawayService.getLiveGiveaways(platform, type);
    }
}
