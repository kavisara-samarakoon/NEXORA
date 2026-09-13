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
class DashboardApiEndpointTests {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void dashboardSummaryReturnsCurrentDefaultProfileMetrics() throws Exception {
        mockMvc.perform(get("/api/dashboard/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activeDealsCount").value(8))
                .andExpect(jsonPath("$.activeGiveawaysCount").value(8))
                .andExpect(jsonPath("$.wishlistItemsCount").value(8))
                .andExpect(jsonPath("$.activePriceAlertsCount").value(5))
                .andExpect(jsonPath("$.bestDiscountValue").value(100))
                .andExpect(jsonPath("$.bestDiscountTitle").value("GTA V: Premium Edition"))
                .andExpect(jsonPath("$.databaseStatus").value("Demo Mode"))
                .andExpect(jsonPath("$.sentinelStatus").value("Local NEXORA guidance"));
    }
}
