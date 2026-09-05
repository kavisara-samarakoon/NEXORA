package com.nexora.api.wishlist.persistence;

import org.springframework.context.annotation.Profile;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

@Profile("dev")
public interface WishlistAlertEventRepository extends JpaRepository<WishlistAlertEvent, Long> {

    List<WishlistAlertEvent> findByUserIdOrderByCreatedAtDescIdDesc(
            long userId,
            Pageable pageable);
}
