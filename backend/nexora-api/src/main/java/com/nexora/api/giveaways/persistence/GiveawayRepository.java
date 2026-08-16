package com.nexora.api.giveaways.persistence;

import org.springframework.context.annotation.Profile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

@Profile("dev")
public interface GiveawayRepository extends JpaRepository<Giveaway, Long> {

    @Query("""
            select giveaway
            from Giveaway giveaway
            where giveaway.active = true
            order by giveaway.id
            """)
    List<Giveaway> findActiveGiveaways();
}
