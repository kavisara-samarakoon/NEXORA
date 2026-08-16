package com.nexora.api.deals.persistence;

import org.springframework.context.annotation.Profile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

@Profile("dev")
public interface DealRepository extends JpaRepository<Deal, Long> {

    @Query("""
            select deal
            from Deal deal
            join fetch deal.game
            join fetch deal.store
            where deal.active = true
            order by deal.id
            """)
    List<Deal> findActiveDeals();
}
