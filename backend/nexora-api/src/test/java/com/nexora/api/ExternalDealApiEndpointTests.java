package com.nexora.api;

import com.nexora.api.deals.CheapSharkDealClient;
import com.nexora.api.deals.CheapSharkDealResponse;
import com.nexora.api.deals.CheapSharkStoreResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ExternalDealApiEndpointTests {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CheapSharkDealClient cheapSharkDealClient;

    @Test
    void existingDealsEndpointRemainsUnchangedAndDoesNotCallCheapShark() throws Exception {
        mockMvc.perform(get("/api/deals"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(8))
                .andExpect(jsonPath("$[0].title").value("Elden Ring: Shadow of the Erdtree"))
                .andExpect(jsonPath("$[0].category").value("Action RPG"));

        verifyNoInteractions(cheapSharkDealClient);
    }

    @Test
    void externalDealsEndpointMapsCheapSharkDealsToNexoraContract() throws Exception {
        when(cheapSharkDealClient.getDeals(12, null, null)).thenReturn(List.of(
                response("Deus Ex", "27", "2.99", "19.99", "85.04", "92", "9.6")
        ));
        when(cheapSharkDealClient.getStores()).thenReturn(List.of(
                store("27", "Fanatical", 1)
        ));

        mockMvc.perform(get("/api/deals/external"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].store").value("Fanatical"))
                .andExpect(jsonPath("$[0].discount").value("-85%"))
                .andExpect(jsonPath("$[0].discountValue").value(85))
                .andExpect(jsonPath("$[0].title").value("Deus Ex"))
                .andExpect(jsonPath("$[0].priceOld").value("$19.99"))
                .andExpect(jsonPath("$[0].priceNew").value("$2.99"))
                .andExpect(jsonPath("$[0].priceValue").value(2.99))
                .andExpect(jsonPath("$[0].rating").value(4.6))
                .andExpect(jsonPath("$[0].stars").value("★★★★★"))
                .andExpect(jsonPath("$[0].category").value("External Deal"))
                .andExpect(jsonPath("$[0].status").value("Lowest Ever"));
    }

    @Test
    void externalDealsEndpointFallsBackWhenCheapSharkFails() throws Exception {
        when(cheapSharkDealClient.getDeals(12, null, null))
                .thenThrow(new IllegalStateException("simulated provider failure"));

        mockMvc.perform(get("/api/deals/external"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(8))
                .andExpect(jsonPath("$[0].title").value("Elden Ring: Shadow of the Erdtree"))
                .andExpect(jsonPath("$[0].category").value("Action RPG"));

        verify(cheapSharkDealClient, never()).getStores();
    }

    @Test
    void externalDealsEndpointKeepsLiveDealsWhenStoreLookupFails() throws Exception {
        when(cheapSharkDealClient.getDeals(12, null, null)).thenReturn(List.of(
                response("Store fallback", "27", "7.50", "15.00", "50", "80", "8")
        ));
        when(cheapSharkDealClient.getStores())
                .thenThrow(new IllegalStateException("simulated stores failure"));

        mockMvc.perform(get("/api/deals/external"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].store").value("Store 27"))
                .andExpect(jsonPath("$[0].title").value("Store fallback"))
                .andExpect(jsonPath("$[0].category").value("External Deal"));
    }

    @Test
    void externalDealsEndpointCapsPageSizeAtConfiguredMaximum() throws Exception {
        when(cheapSharkDealClient.getDeals(24, null, null)).thenReturn(List.of(
                response("Capped result", "7", "5.00", "10.00", "50", null, "8")
        ));
        when(cheapSharkDealClient.getStores()).thenReturn(List.of(
                store("7", "GOG", "1")
        ));

        mockMvc.perform(get("/api/deals/external").queryParam("pageSize", "100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].title").value("Capped result"))
                .andExpect(jsonPath("$[0].store").value("GOG"));

        verify(cheapSharkDealClient).getDeals(24, null, null);
    }

    private static CheapSharkDealResponse response(
            String title,
            String storeId,
            String salePrice,
            String normalPrice,
            String savings,
            String steamRatingPercent,
            String dealRating) {
        return new CheapSharkDealResponse(
                title,
                storeId,
                salePrice,
                normalPrice,
                savings,
                steamRatingPercent,
                dealRating
        );
    }

    private static CheapSharkStoreResponse store(String storeId, String storeName, Object isActive) {
        return new CheapSharkStoreResponse(storeId, storeName, isActive);
    }
}
