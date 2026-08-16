package com.nexora.api.wishlist.persistence;

import org.springframework.context.annotation.Profile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

@Profile("dev")
public interface WishlistItemRepository extends JpaRepository<WishlistItem, Long> {

    @Query("""
            select item
            from WishlistItem item
            where item.active = true
            order by item.id
            """)
    List<WishlistItem> findActiveWishlistItems();
}
