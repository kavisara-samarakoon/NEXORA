package com.nexora.api;

import com.nexora.api.deals.CheapSharkDealClient;
import com.nexora.api.deals.CheapSharkDealResponse;
import com.nexora.api.deals.CheapSharkStoreResponse;
import com.nexora.api.deals.ExternalDealsCache;
import com.nexora.api.giveaways.GamerPowerClientException;
import com.nexora.api.giveaways.GamerPowerGiveawayClient;
import com.nexora.api.giveaways.GamerPowerGiveawayResponse;
import com.nexora.api.giveaways.LiveGiveawayService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class LiveDealsAndGiveawaysEndpointTests {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CheapSharkDealClient cheapSharkDealClient;

    @MockitoBean
    private GamerPowerGiveawayClient gamerPowerGiveawayClient;

    @Autowired
    private ExternalDealsCache externalDealsCache;

    @Autowired
    private LiveGiveawayService liveGiveawayService;

    @BeforeEach
    void resetCaches() {
        externalDealsCache.clear();
        liveGiveawayService.clearCache();
    }

    @Test
    void liveDealsEndpointReturnsMetadataArtworkStoreOptionsAndSortedDeals() throws Exception {
        when(cheapSharkDealClient.getDeals(12, null, null, "Savings", true, "1", 0))
                .thenReturn(List.of(new CheapSharkDealResponse(
                        "Portal 2",
                        "1",
                        "1.99",
                        "9.99",
                        "80.08",
                        "98",
                        "9.9",
                        "deal%2Fportal2",
                        "42",
                        "620",
                        "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/620/capsule.jpg",
                        "95",
                        1700000000L
                )));
        when(cheapSharkDealClient.getStores()).thenReturn(List.of(
                new CheapSharkStoreResponse("1", "Steam", 1),
                new CheapSharkStoreResponse("25", "Epic Games Store", 1),
                new CheapSharkStoreResponse("99", "Retired Store", 0)
        ));

        mockMvc.perform(get("/api/deals/live")
                        .param("sortBy", "Savings")
                        .param("desc", "1")
                        .param("storeId", "1")
                        .param("pageNumber", "0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.source").value("cheapshark"))
                .andExpect(jsonPath("$.sourceAttribution").value("CheapShark"))
                .andExpect(jsonPath("$.currency").value("USD"))
                .andExpect(jsonPath("$.cacheState").value("live"))
                .andExpect(jsonPath("$.availableStores.length()").value(3))
                .andExpect(jsonPath("$.deals.length()").value(1))
                .andExpect(jsonPath("$.deals[0].gameId").value("42"))
                .andExpect(jsonPath("$.deals[0].externalDealId").value("deal%2Fportal2"))
                .andExpect(jsonPath("$.deals[0].steamAppId").value("620"))
                .andExpect(jsonPath("$.deals[0].metacriticScore").value(95))
                .andExpect(jsonPath("$.deals[0].currency").value("USD"))
                .andExpect(jsonPath("$.deals[0].source").value("cheapshark"));
    }

    @Test
    void liveDealsRejectsUnsupportedSortAndInvalidStoreId() throws Exception {
        mockMvc.perform(get("/api/deals/live").param("sortBy", "InvalidField"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("validation_failed"));

        mockMvc.perform(get("/api/deals/live").param("storeId", "abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("validation_failed"));
    }

    @Test
    void liveGiveawaysReturnsVerifiedFeedAndFailsGracefullyWithoutInventingGiveaways() throws Exception {
        when(gamerPowerGiveawayClient.getGiveaways("steam", "game")).thenReturn(List.of(
                new GamerPowerGiveawayResponse(
                        901L, "Test Indie Key", "$9.99",
                        "https://www.gamerpower.com/thumb.jpg",
                        "https://www.gamerpower.com/image.jpg",
                        "Full game key.", "Claim via official link.",
                        "https://www.gamerpower.com/open/test-indie-key",
                        "2026-11-24 08:00:00",
                        "Game", "PC, Steam",
                        "2099-01-01 00:00:00",
                        200, "Active",
                        "https://www.gamerpower.com/test-indie-key",
                        null
                )
        ));

        mockMvc.perform(get("/api/giveaways/live")
                        .param("platform", "steam")
                        .param("type", "game"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.source").value("gamerpower"))
                .andExpect(jsonPath("$.cacheState").value("live"))
                .andExpect(jsonPath("$.giveaways.length()").value(1))
                .andExpect(jsonPath("$.giveaways[0].claimUrl").value("https://www.gamerpower.com/open/test-indie-key"));

        when(gamerPowerGiveawayClient.getGiveaways("gog", null))
                .thenThrow(new GamerPowerClientException("Upstream error"));

        mockMvc.perform(get("/api/giveaways/live").param("platform", "gog"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cacheState").value("unavailable"))
                .andExpect(jsonPath("$.giveaways.length()").value(0))
                .andExpect(jsonPath("$.notice").value(containsString("could not be retrieved")));
    }

    @Test
    void liveGiveawaysRejectsInvalidPlatformFilter() throws Exception {
        mockMvc.perform(get("/api/giveaways/live").param("platform", "invalid-platform"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("validation_failed"));
    }
}
