package com.nexora.api.giveaways;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/giveaways")
public class GiveawayController {

    private final GiveawayCatalogService giveawayService;

    public GiveawayController(GiveawayCatalogService giveawayService) {
        this.giveawayService = giveawayService;
    }

    @GetMapping
    public List<Giveaway> getGiveaways() {
        return giveawayService.getGiveaways();
    }
}
