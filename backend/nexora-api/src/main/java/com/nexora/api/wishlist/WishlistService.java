package com.nexora.api.wishlist;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class WishlistService {

    private static final List<WishlistItem> WISHLIST_ITEMS = List.of(
            new WishlistItem(1, "Ghost of Tsushima: Director's Cut", "Steam", "$39.99", "$24.99",
                    "$29.99", "-25%", "price-drop", true, "high"),
            new WishlistItem(2, "Persona 5 Royal", "Steam", "$29.99", "$19.99",
                    "$29.99", "-50%", "price-drop", true, "high"),
            new WishlistItem(3, "Monster Hunter Wilds", "Epic Games", "$69.99", "$44.99",
                    "$59.99", null, "tracking", true, "medium"),
            new WishlistItem(4, "The Witcher 4", "GOG", "TBA", "$49.99",
                    "—", null, "tracking", true, "low"),
            new WishlistItem(5, "Hollow Knight: Silksong", "Steam", "FREE", "$0.00",
                    "FREE", "-100%", "free-now", false, "high"),
            new WishlistItem(6, "Starfield: Shattered Space", "Steam", "$41.99", "$29.99",
                    "$41.99", "-40%", "price-drop", true, "medium"),
            new WishlistItem(7, "Baldur's Gate 3", "GOG", "$59.99", "$39.99",
                    "$47.99", null, "tracking", false, "low"),
            new WishlistItem(8, "Dead Cells: Return to Castlevania", "Epic Games", "FREE", "$0.00",
                    "FREE", "-100%", "free-now", false, "high")
    );

    public List<WishlistItem> getWishlistItems() {
        return WISHLIST_ITEMS;
    }
}

