package com.nexora.api.giveaways;

import com.nexora.api.giveaways.persistence.GiveawayRepository;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DatabaseGiveawayServiceTests {

    @Test
    void mapsActiveRepositoryGiveawaysToTheExistingApiContract() {
        GiveawayRepository repository = mock(GiveawayRepository.class);
        com.nexora.api.giveaways.persistence.Giveaway databaseGiveaway =
                new com.nexora.api.giveaways.persistence.Giveaway(
                        1L,
                        "steam",
                        "Steam",
                        "Cyber Shadow",
                        "Action · Platformer · Indie",
                        "2d 14h 32m",
                        2,
                        78,
                        "live",
                        "popular",
                        "$19.99",
                        true
                );
        when(repository.findActiveGiveaways()).thenReturn(List.of(databaseGiveaway));

        List<Giveaway> giveaways = new DatabaseGiveawayService(repository).getGiveaways();

        assertEquals(1, giveaways.size());
        Giveaway giveaway = giveaways.get(0);
        assertAll(
                () -> assertEquals(1L, giveaway.id()),
                () -> assertEquals("steam", giveaway.platform()),
                () -> assertEquals("Steam", giveaway.platformLabel()),
                () -> assertEquals("Cyber Shadow", giveaway.title()),
                () -> assertEquals("Action · Platformer · Indie", giveaway.genre()),
                () -> assertEquals("2d 14h 32m", giveaway.timer()),
                () -> assertEquals(2, giveaway.daysRemaining()),
                () -> assertEquals(78, giveaway.claimed()),
                () -> assertEquals("live", giveaway.status()),
                () -> assertEquals("popular", giveaway.tag()),
                () -> assertEquals("$19.99", giveaway.originalPrice())
        );
        verify(repository).findActiveGiveaways();
    }
}
