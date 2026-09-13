package com.nexora.api.deals;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
@Profile("!dev")
public class DealService implements DealCatalogService {

    private static final List<Deal> DEALS = List.of(
            new Deal(1, "Steam", "-75%", 75, "Elden Ring: Shadow of the Erdtree",
                    "$39.99", "$9.99", decimal("9.99"), decimal("4.8"), "★★★★★", "Action RPG", "Strong discount", null),
            new Deal(2, "Epic Games", "-60%", 60, "Cyberpunk 2077: Phantom Liberty",
                    "$29.99", "$11.99", decimal("11.99"), decimal("4.6"), "★★★★☆", "RPG", "Strong discount", null),
            new Deal(3, "Humble", "-85%", 85, "Hades II — Early Access",
                    "$29.99", "$4.49", decimal("4.49"), decimal("4.9"), "★★★★★", "Roguelike", "Deep discount", null),
            new Deal(4, "GOG", "-50%", 50, "Baldur's Gate 3",
                    "$59.99", "$29.99", decimal("29.99"), decimal("4.9"), "★★★★★", "RPG", "Current offer", null),
            new Deal(5, "Steam", "-40%", 40, "Starfield: Shattered Space",
                    "$69.99", "$41.99", decimal("41.99"), decimal("3.8"), "★★★★☆", "Sci-Fi RPG", "Current offer", null),
            new Deal(6, "Ubisoft", "-70%", 70, "Assassin's Creed Mirage",
                    "$49.99", "$14.99", decimal("14.99"), decimal("4.2"), "★★★★☆", "Action", "Strong discount", null),
            new Deal(7, "Epic Games", "-100%", 100, "GTA V: Premium Edition",
                    "$29.99", "FREE", BigDecimal.ZERO, decimal("4.5"), "★★★★★", "Open World", "Free offer", null),
            new Deal(8, "Steam", "-55%", 55, "Ghost of Tsushima: Director's Cut",
                    "$59.99", "$26.99", decimal("26.99"), decimal("4.7"), "★★★★★", "Action Adventure", "Current offer", null)
    );

    @Override
    public List<Deal> getDeals() {
        return DEALS;
    }

    private static BigDecimal decimal(String value) {
        return new BigDecimal(value);
    }
}
