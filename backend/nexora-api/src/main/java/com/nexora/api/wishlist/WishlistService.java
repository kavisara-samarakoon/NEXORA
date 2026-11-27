package com.nexora.api.wishlist;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@Profile("!dev")
public class WishlistService implements WishlistCatalogService {

    private static final List<WishlistItem> WISHLIST_ITEMS = List.of(
            seededItem(1, "Ghost of Tsushima: Director's Cut", "Steam", "$39.99", "$24.99",
                    "$29.99", "-25%", "price-drop", true, "high"),
            seededItem(2, "Persona 5 Royal", "Steam", "$29.99", "$19.99",
                    "$29.99", "-50%", "price-drop", true, "high"),
            seededItem(3, "Monster Hunter Wilds", "Epic Games", "$69.99", "$44.99",
                    "$59.99", null, "tracking", true, "medium"),
            seededItem(4, "The Witcher 4", "GOG", "TBA", "$49.99",
                    "—", null, "tracking", true, "low"),
            seededItem(5, "Hollow Knight: Silksong", "Steam", "FREE", "$0.00",
                    "FREE", "-100%", "free-now", false, "high"),
            seededItem(6, "Starfield: Shattered Space", "Steam", "$41.99", "$29.99",
                    "$41.99", "-40%", "price-drop", true, "medium"),
            seededItem(7, "Baldur's Gate 3", "GOG", "$59.99", "$39.99",
                    "$47.99", null, "tracking", false, "low"),
            seededItem(8, "Dead Cells: Return to Castlevania", "Epic Games", "FREE", "$0.00",
                    "FREE", "-100%", "free-now", false, "high")
    );

    private static WishlistItem seededItem(
            long id,
            String title,
            String store,
            String currentPrice,
            String targetPrice,
            String lowestEver,
            String discount,
            String status,
            boolean alertActive,
            String priority) {
        String currency = WishlistPriceParser.establishStoredCurrency(currentPrice, targetPrice, null);
        return new WishlistItem(
                id,
                title,
                store,
                currentPrice,
                targetPrice,
                lowestEver,
                discount,
                status,
                alertActive,
                priority,
                WishlistAlertEvaluator.evaluate(currentPrice, targetPrice, alertActive, currency),
                null,
                null,
                currency,
                null,
                "seeded-sample",
                "seeded-sample"
        );
    }

    @Override
    public List<WishlistItem> getWishlistItems() {
        return WISHLIST_ITEMS;
    }
}
