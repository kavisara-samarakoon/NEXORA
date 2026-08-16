package com.nexora.api.wishlist;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/wishlist")
public class WishlistController {

    private final WishlistCatalogService wishlistService;

    public WishlistController(WishlistCatalogService wishlistService) {
        this.wishlistService = wishlistService;
    }

    @GetMapping
    public List<WishlistItem> getWishlistItems() {
        return wishlistService.getWishlistItems();
    }
}
