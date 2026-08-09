package com.nexora.api.deals;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DealService {

    private static final List<Deal> DEALS = List.of(
            new Deal(1, "Steam", "-75%", 75, "Elden Ring: Shadow of the Erdtree",
                    "$39.99", "$9.99", 9.99, 4.8, "★★★★★", "Action RPG", "Historical Low"),
            new Deal(2, "Epic Games", "-60%", 60, "Cyberpunk 2077: Phantom Liberty",
                    "$29.99", "$11.99", 11.99, 4.6, "★★★★☆", "RPG", "Great Deal"),
            new Deal(3, "Humble", "-85%", 85, "Hades II — Early Access",
                    "$29.99", "$4.49", 4.49, 4.9, "★★★★★", "Roguelike", "Lowest Ever"),
            new Deal(4, "GOG", "-50%", 50, "Baldur's Gate 3",
                    "$59.99", "$29.99", 29.99, 4.9, "★★★★★", "RPG", "Good Price"),
            new Deal(5, "Steam", "-40%", 40, "Starfield: Shattered Space",
                    "$69.99", "$41.99", 41.99, 3.8, "★★★★☆", "Sci-Fi RPG", "Average"),
            new Deal(6, "Ubisoft", "-70%", 70, "Assassin's Creed Mirage",
                    "$49.99", "$14.99", 14.99, 4.2, "★★★★☆", "Action", "Great Deal"),
            new Deal(7, "Epic Games", "-100%", 100, "GTA V: Premium Edition",
                    "$29.99", "FREE", 0, 4.5, "★★★★★", "Open World", "Free Weekend"),
            new Deal(8, "Steam", "-55%", 55, "Ghost of Tsushima: Director's Cut",
                    "$59.99", "$26.99", 26.99, 4.7, "★★★★★", "Action Adventure", "Good Price")
    );

    public List<Deal> getDeals() {
        return DEALS;
    }
}

