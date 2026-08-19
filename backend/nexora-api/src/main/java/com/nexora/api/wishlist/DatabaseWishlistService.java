package com.nexora.api.wishlist;

import com.nexora.api.wishlist.persistence.WishlistItemRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Profile("dev")
public class DatabaseWishlistService implements WishlistCatalogService {

    private final WishlistItemRepository wishlistItemRepository;

    public DatabaseWishlistService(WishlistItemRepository wishlistItemRepository) {
        this.wishlistItemRepository = wishlistItemRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<WishlistItem> getWishlistItems() {
        return wishlistItemRepository.findActiveWishlistItems().stream()
                .map(WishlistItemMapper::toResponse)
                .toList();
    }
}
