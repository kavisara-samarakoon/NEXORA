package com.nexora.api.giveaways;

import com.nexora.api.giveaways.persistence.GiveawayRepository;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Profile("dev")
public class DatabaseGiveawayService implements GiveawayCatalogService {

    private final GiveawayRepository giveawayRepository;

    public DatabaseGiveawayService(GiveawayRepository giveawayRepository) {
        this.giveawayRepository = giveawayRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Giveaway> getGiveaways() {
        return giveawayRepository.findActiveGiveaways().stream()
                .map(DatabaseGiveawayService::toApiGiveaway)
                .toList();
    }

    private static Giveaway toApiGiveaway(
            com.nexora.api.giveaways.persistence.Giveaway giveaway) {
        return new Giveaway(
                giveaway.getId(),
                giveaway.getPlatform(),
                giveaway.getPlatformLabel(),
                giveaway.getTitle(),
                giveaway.getGenre(),
                giveaway.getTimer(),
                giveaway.getDaysRemaining(),
                giveaway.getClaimed(),
                giveaway.getStatus(),
                giveaway.getTag(),
                giveaway.getOriginalPrice()
        );
    }
}
