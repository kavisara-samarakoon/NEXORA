package com.nexora.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class DemoApiEndpointTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void dealsEndpointReturnsDemoDeals() throws Exception {
        mockMvc.perform(get("/api/deals"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(8))
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].title").value("Elden Ring: Shadow of the Erdtree"))
                .andExpect(jsonPath("$[0].store").value("Steam"))
                .andExpect(jsonPath("$[0].discount").value("-75%"))
                .andExpect(jsonPath("$[0].priceNew").value("$9.99"))
                .andExpect(jsonPath("$[0].priceOld").value("$39.99"))
                .andExpect(jsonPath("$[0].priceValue").value(9.99))
                .andExpect(jsonPath("$[0].discountValue").value(75))
                .andExpect(jsonPath("$[0].rating").value(4.8))
                .andExpect(jsonPath("$[0].stars").value("★★★★★"))
                .andExpect(jsonPath("$[0].category").value("Action RPG"))
                .andExpect(jsonPath("$[0].status").value("Historical Low"));
    }

    @Test
    void giveawaysEndpointReturnsDemoGiveaways() throws Exception {
        mockMvc.perform(get("/api/giveaways"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(8))
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].platform").value("steam"))
                .andExpect(jsonPath("$[0].title").value("Cyber Shadow"))
                .andExpect(jsonPath("$[0].platformLabel").value("Steam"))
                .andExpect(jsonPath("$[0].genre").value("Action · Platformer · Indie"))
                .andExpect(jsonPath("$[0].timer").value("2d 14h 32m"))
                .andExpect(jsonPath("$[0].daysRemaining").value(2))
                .andExpect(jsonPath("$[0].claimed").value(78))
                .andExpect(jsonPath("$[0].status").value("live"))
                .andExpect(jsonPath("$[0].tag").value("popular"))
                .andExpect(jsonPath("$[0].originalPrice").value("$19.99"));
    }

    @Test
    void wishlistEndpointReturnsDemoWishlist() throws Exception {
        mockMvc.perform(get("/api/wishlist"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(8))
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].title").value("Ghost of Tsushima: Director's Cut"))
                .andExpect(jsonPath("$[0].store").value("Steam"))
                .andExpect(jsonPath("$[0].currentPrice").value("$39.99"))
                .andExpect(jsonPath("$[0].targetPrice").value("$24.99"))
                .andExpect(jsonPath("$[0].lowestEver").value("$29.99"))
                .andExpect(jsonPath("$[0].discount").value("-25%"))
                .andExpect(jsonPath("$[0].status").value("price-drop"))
                .andExpect(jsonPath("$[0].alertActive").value(true))
                .andExpect(jsonPath("$[0].priority").value("high"));
    }

    @Test
    void securityStatusEndpointReturnsDemoSecuritySummary() throws Exception {
        mockMvc.perform(get("/api/security/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.securityScore").value(92))
                .andExpect(jsonPath("$.activeSessions").value(2))
                .andExpect(jsonPath("$.protectedApis").value(4))
                .andExpect(jsonPath("$.alertCount").value(1))
                .andExpect(jsonPath("$.accountProtection.length()").value(4))
                .andExpect(jsonPath("$.networkProtection.length()").value(4));
    }
}
