package com.nexora.api.wishlist.persistence;

import org.springframework.context.annotation.Profile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

@Profile("dev")
public interface WishlistItemRepository extends JpaRepository<WishlistItem, Long> {

    @Query("""
            select item
            from WishlistItem item
            where item.active = true
              and item.userId is null
            order by item.id
            """)
    List<WishlistItem> findActiveWishlistItems();

    List<WishlistItem> findByUserIdAndActiveTrueOrderById(long userId);

    Optional<WishlistItem> findFirstByUserIdAndActiveTrueAndTitleIgnoreCaseAndStoreIgnoreCaseOrderByIdAsc(
            long userId,
            String title,
            String store);

    Optional<WishlistItem> findByIdAndUserIdAndActiveTrue(long id, long userId);
}
