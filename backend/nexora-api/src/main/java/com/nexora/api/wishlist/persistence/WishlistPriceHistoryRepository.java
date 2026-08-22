package com.nexora.api.wishlist.persistence;

import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

@Profile("dev")
public interface WishlistPriceHistoryRepository
        extends JpaRepository<WishlistPriceHistoryEntry, Long> {

    Optional<WishlistPriceHistoryEntry>
    findFirstByUserIdAndWishlistItemIdOrderByObservedAtDescIdDesc(
            long userId,
            long wishlistItemId);

    List<WishlistPriceHistoryEntry> findByUserIdAndWishlistItemIdOrderByObservedAtDescIdDesc(
            long userId,
            long wishlistItemId,
            Pageable pageable);
}
