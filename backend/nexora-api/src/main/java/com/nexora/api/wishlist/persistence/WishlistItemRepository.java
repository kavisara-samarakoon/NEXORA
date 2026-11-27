package com.nexora.api.wishlist.persistence;

import jakarta.persistence.LockModeType;
import org.springframework.context.annotation.Profile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
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

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select item
            from WishlistItem item
            where item.active = true
              and item.userId is not null
              and item.alertActive = true
            order by item.id
            """)
    List<WishlistItem> findActiveUserAlertItemsForRefresh();

    List<WishlistItem> findByUserIdAndActiveTrueOrderById(long userId);

    Optional<WishlistItem> findFirstByUserIdAndActiveTrueAndTitleIgnoreCaseAndStoreIgnoreCaseOrderByIdAsc(
            long userId,
            String title,
            String store);

    Optional<WishlistItem> findByIdAndUserIdAndActiveTrue(long id, long userId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<WishlistItem> findForUpdateByIdAndUserIdAndActiveTrue(long id, long userId);
}
