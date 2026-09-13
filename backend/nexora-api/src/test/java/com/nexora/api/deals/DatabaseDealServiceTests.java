package com.nexora.api.deals;

import com.nexora.api.deals.persistence.DealRepository;
import com.nexora.api.deals.persistence.Game;
import com.nexora.api.deals.persistence.Store;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DatabaseDealServiceTests {

    @Test
    void mapsActiveRepositoryDealsToTheExistingApiContract() {
        DealRepository repository = mock(DealRepository.class);
        Store store = new Store(1L, "Steam");
        List<com.nexora.api.deals.persistence.Deal> databaseDeals = List.of(
                databaseDeal(1L, store, "Five stars", "4.5"),
                databaseDeal(2L, store, "Four stars", "4.0"),
                databaseDeal(3L, store, "Three stars", "3.0"),
                databaseDeal(4L, store, "Two stars", "2.9"),
                databaseDeal(5L, store, "Unrated", "0")
        );
        when(repository.findActiveDeals()).thenReturn(databaseDeals);

        List<Deal> deals = new DatabaseDealService(repository).getDeals();

        assertEquals(5, deals.size());
        Deal firstDeal = deals.get(0);
        assertAll(
                () -> assertEquals(1L, firstDeal.id()),
                () -> assertEquals("Steam", firstDeal.store()),
                () -> assertEquals("-50%", firstDeal.discount()),
                () -> assertEquals(50, firstDeal.discountValue()),
                () -> assertEquals("Five stars", firstDeal.title()),
                () -> assertEquals("$20.00", firstDeal.priceOld()),
                () -> assertEquals("$10.00", firstDeal.priceNew()),
                () -> assertEquals(new BigDecimal("10.00"), firstDeal.priceValue()),
                () -> assertEquals(new BigDecimal("4.5"), firstDeal.rating()),
                () -> assertEquals("★★★★★", firstDeal.stars()),
                () -> assertEquals("RPG", firstDeal.category()),
                () -> assertEquals("Current offer", firstDeal.status()),
                () -> assertNull(firstDeal.dealUrl()),
                () -> assertEquals("★★★★☆", deals.get(1).stars()),
                () -> assertEquals("★★★☆☆", deals.get(2).stars()),
                () -> assertEquals("★★☆☆☆", deals.get(3).stars()),
                () -> assertEquals("", deals.get(4).stars())
        );
        verify(repository).findActiveDeals();
    }

    private static com.nexora.api.deals.persistence.Deal databaseDeal(
            long id, Store store, String title, String rating) {
        Game game = new Game(id, title, "RPG", new BigDecimal(rating));
        return new com.nexora.api.deals.persistence.Deal(
                id,
                game,
                store,
                "-50%",
                50,
                "$20.00",
                "$10.00",
                new BigDecimal("10.00"),
                "Current offer",
                true
        );
    }
}
