package com.nexora.api.giveaways;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@Profile("!dev")
public class GiveawayService implements GiveawayCatalogService {

    private static final List<Giveaway> GIVEAWAYS = List.of(
            new Giveaway(1, "steam", "Steam", "Cyber Shadow", "Action · Platformer · Indie",
                    "2d 14h 32m", 2, 78, "live", "popular", "$19.99"),
            new Giveaway(2, "epic", "Epic Games", "Star Wars Battlefront II", "Action · Shooter · Multiplayer",
                    "5d 06h 12m", 5, 45, "live", "new", "$39.99"),
            new Giveaway(3, "gog", "GOG", "Shadow Warrior 2", "FPS · Action · Open World",
                    "1d 03h 45m", 1, 91, "live", "ending-soon", "$29.99"),
            new Giveaway(4, "prime", "Prime Gaming", "Fallout 76", "RPG · Survival · Open World",
                    "6d 18h 00m", 6, 32, "live", "new", "$39.99"),
            new Giveaway(5, "epic", "Epic Games", "Dead Cells", "Roguelike · Action · Indie",
                    "0d 08h 22m", 0, 95, "live", "ending-soon", "$24.99"),
            new Giveaway(6, "steam", "Steam", "Hollow Knight", "Metroidvania · Indie · Adventure",
                    "4d 11h 50m", 4, 62, "live", "popular", "$14.99"),
            new Giveaway(7, "gog", "GOG", "The Witcher: Enhanced Edition", "RPG · Action · Story Rich",
                    "3d 09h 15m", 3, 88, "live", "popular", "$9.99"),
            new Giveaway(8, "prime", "Prime Gaming", "Celeste", "Platformer · Indie · Difficult",
                    "7d 00h 00m", 7, 18, "live", "new", "$19.99")
    );

    @Override
    public List<Giveaway> getGiveaways() {
        return GIVEAWAYS;
    }
}
