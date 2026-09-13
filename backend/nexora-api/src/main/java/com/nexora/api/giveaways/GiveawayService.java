package com.nexora.api.giveaways;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@Profile("!dev")
public class GiveawayService implements GiveawayCatalogService {

    private static final List<Giveaway> GIVEAWAYS = List.of(
            new Giveaway(1, "steam", "Steam", "Cyber Shadow", "Action · Platformer · Indie",
                    "End date unverified", 0, 0, "sample", "sample", "$19.99"),
            new Giveaway(2, "epic", "Epic Games", "Star Wars Battlefront II", "Action · Shooter · Multiplayer",
                    "End date unverified", 0, 0, "sample", "sample", "$39.99"),
            new Giveaway(3, "gog", "GOG", "Shadow Warrior 2", "FPS · Action · Open World",
                    "End date unverified", 0, 0, "sample", "sample", "$29.99"),
            new Giveaway(4, "prime", "Prime Gaming", "Fallout 76", "RPG · Survival · Open World",
                    "End date unverified", 0, 0, "sample", "sample", "$39.99"),
            new Giveaway(5, "epic", "Epic Games", "Dead Cells", "Roguelike · Action · Indie",
                    "End date unverified", 0, 0, "sample", "sample", "$24.99"),
            new Giveaway(6, "steam", "Steam", "Hollow Knight", "Metroidvania · Indie · Adventure",
                    "End date unverified", 0, 0, "sample", "sample", "$14.99"),
            new Giveaway(7, "gog", "GOG", "The Witcher: Enhanced Edition", "RPG · Action · Story Rich",
                    "End date unverified", 0, 0, "sample", "sample", "$9.99"),
            new Giveaway(8, "prime", "Prime Gaming", "Celeste", "Platformer · Indie · Difficult",
                    "End date unverified", 0, 0, "sample", "sample", "$19.99")
    );

    @Override
    public List<Giveaway> getGiveaways() {
        return GIVEAWAYS;
    }
}
