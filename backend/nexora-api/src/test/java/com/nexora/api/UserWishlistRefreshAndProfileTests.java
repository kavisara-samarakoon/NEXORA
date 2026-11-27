package com.nexora.api;

import com.nexora.api.deals.CheapSharkDealClient;
import com.nexora.api.deals.CheapSharkDealResponse;
import com.nexora.api.deals.CheapSharkStoreResponse;
import com.nexora.api.deals.ExternalDealsCache;
import com.nexora.api.wishlist.WishlistAlertEvaluator;
import com.nexora.api.wishlist.WishlistAlertEvaluation;
import com.nexora.api.wishlist.WishlistPriceHistoryService;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "nexora.auth.abuse-controls.enabled=false")
@AutoConfigureMockMvc
class UserWishlistRefreshAndProfileTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ExternalDealsCache externalDealsCache;

    @Autowired
    private WishlistPriceHistoryService wishlistPriceHistoryService;

    @MockitoBean
    private CheapSharkDealClient cheapSharkDealClient;

    @BeforeEach
    void clearExternalDealsCache() {
        externalDealsCache.clear();
    }

    @Test
    void authenticatedUserCanPersistDisplayNameUpdateAndBlankNameIsRejected() throws Exception {
        mockMvc.perform(patch("/api/auth/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"displayName\":\"Should Fail\"}"))
                .andExpect(status().isUnauthorized());

        String token = registerAndLogin(uniqueUser());

        mockMvc.perform(patch("/api/auth/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"displayName\":\"   \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("validation_failed"));

        mockMvc.perform(patch("/api/auth/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"displayName\":\"  Kavisara Live  \"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Kavisara Live"));

        mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Kavisara Live"));
    }

    @Test
    void wishlistRefreshRecordsObservationsDeduplicatesAndIsolatesAccounts() throws Exception {
        mockMvc.perform(post("/api/me/wishlist/refresh"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("authentication_required"));

        String userAToken = registerAndLogin(uniqueUser());
        String userBToken = registerAndLogin(uniqueUser());

        MvcResult created = mockMvc.perform(post("/api/me/wishlist")
                        .header("Authorization", "Bearer " + userAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Hades II",
                                  "store": "Steam",
                                  "currentPrice": "$29.99",
                                  "targetPrice": "$22.00",
                                  "externalGameId": "20202",
                                  "currency": "USD",
                                  "alertActive": true
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.externalGameId").value("20202"))
                .andReturn();
        long itemId = objectMapper.readTree(created.getResponse().getContentAsString())
                .path("id").longValue();

        when(cheapSharkDealClient.getStores()).thenReturn(List.of(
                new CheapSharkStoreResponse("1", "Steam", 1)
        ));
        when(cheapSharkDealClient.getDeals(12, "Hades II", null)).thenReturn(List.of(
                new CheapSharkDealResponse(
                        "Hades II", "1", "19.99", "29.99", "33.34",
                        "97", "9.4", "deal%2Fhades2", "20202", "1145350",
                        "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1145350/header.jpg",
                        "94", 1700000100L)
        ));

        mockMvc.perform(post("/api/me/wishlist/refresh")
                        .header("Authorization", "Bearer " + userAToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scannedItems").value(1))
                .andExpect(jsonPath("$.matchedItems").value(1))
                .andExpect(jsonPath("$.updatedItems").value(1))
                .andExpect(jsonPath("$.observationsRecorded").value(1))
                .andExpect(jsonPath("$.targetReachedEventsCreated").value(1))
                .andExpect(jsonPath("$.items[0].currentPrice").value("$19.99"))
                .andExpect(jsonPath("$.items[0].lowestEver").value("$19.99"))
                .andExpect(jsonPath("$.items[0].alertEvaluation.targetReached").value(true));

        // Second refresh with identical observed price deduplicates snapshot and alert event.
        mockMvc.perform(post("/api/me/wishlist/refresh")
                        .header("Authorization", "Bearer " + userAToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matchedItems").value(1))
                .andExpect(jsonPath("$.observationsRecorded").value(0))
                .andExpect(jsonPath("$.targetReachedEventsCreated").value(0));

        mockMvc.perform(get("/api/me/wishlist/{id}/price-history", itemId)
                        .header("Authorization", "Bearer " + userAToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[1].priceLabel").value("$19.99"))
                .andExpect(jsonPath("$[1].source").value("cheapshark-refresh"));

        mockMvc.perform(get("/api/me/wishlist/alert-events")
                        .header("Authorization", "Bearer " + userAToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].deliveryStatus").value("not-delivered"))
                .andExpect(jsonPath("$[0].observationSource").value("cheapshark-refresh"));

        // Account B cannot read, refresh, inspect history, update, or delete Account A's item.
        mockMvc.perform(get("/api/me/wishlist")
                        .header("Authorization", "Bearer " + userBToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(get("/api/me/wishlist/{id}/price-history", itemId)
                        .header("Authorization", "Bearer " + userBToken))
                .andExpect(status().isNotFound());

        mockMvc.perform(patch("/api/me/wishlist/{id}/alert", itemId)
                        .header("Authorization", "Bearer " + userBToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"alertActive\":false}"))
                .andExpect(status().isNotFound());

        mockMvc.perform(delete("/api/me/wishlist/{id}", itemId)
                        .header("Authorization", "Bearer " + userBToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void currencyMismatchDoesNotTriggerTargetReached() {
        WishlistAlertEvaluation mismatched =
                WishlistAlertEvaluator.evaluate("€14.99", "$19.99", true);
        assertFalse(mismatched.targetReached());
        assertEquals("not-evaluable", mismatched.state());
        assertTrue(mismatched.message().contains("EUR"));
        assertTrue(mismatched.message().contains("USD"));
    }

    @Test
    void refreshPaginatesPastTenItemsCountsSnapshotsPastNinetyAndClearsStaleStatus() throws Exception {
        String token = registerAndLogin(uniqueUser());

        when(cheapSharkDealClient.getStores()).thenReturn(List.of(
                new CheapSharkStoreResponse("1", "Steam", 1)
        ));

        long firstItemId = -1L;
        long eleventhItemId = -1L;
        for (int index = 1; index <= 11; index++) {
            String title = "Paged Game " + index;
            String gameId = String.valueOf(80000 + index);
            String initialStatus = index == 1 ? "price-drop" : "tracking";
            String initialDiscount = index == 1 ? "-50%" : null;
            MvcResult created = mockMvc.perform(post("/api/me/wishlist")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {
                                      "title": "%s",
                                      "store": "Steam",
                                      "currentPrice": "$19.99",
                                      "targetPrice": "$15.00",
                                      "lowestEver": "$9.99",
                                      "discount": %s,
                                      "status": "%s",
                                      "externalGameId": "%s",
                                      "currency": "USD",
                                      "alertActive": true
                                    }
                                    """.formatted(
                                    title,
                                    initialDiscount == null ? "null" : "\"" + initialDiscount + "\"",
                                    initialStatus,
                                    gameId
                            )))
                    .andExpect(status().isCreated())
                    .andReturn();
            long createdId = objectMapper.readTree(created.getResponse().getContentAsString())
                    .path("id").longValue();
            if (index == 1) {
                firstItemId = createdId;
            }
            if (index == 11) {
                eleventhItemId = createdId;
            }
            String observedSale = index == 1 ? "19.99" : "12.99";
            String savings = index == 1 ? "0" : "35.0";
            when(cheapSharkDealClient.getDeals(12, title, null)).thenReturn(List.of(
                    new CheapSharkDealResponse(
                            title, "1", observedSale, "19.99", savings,
                            "95", "9.0", "deal-" + index, gameId, null, null, "90", 1700000200L)
            ));
        }

        // Seed 95 historical snapshots on item 1 so recent list is saturated at limit=90.
        MvcResult meResult = mockMvc.perform(get("/api/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        long userId = objectMapper.readTree(meResult.getResponse().getContentAsString())
                .path("id").longValue();
        for (int s = 0; s < 95; s++) {
            wishlistPriceHistoryService.recordSnapshot(
                    userId,
                    new com.nexora.api.wishlist.WishlistItem(
                            firstItemId,
                            "Paged Game 1",
                            "Steam",
                            "$" + (30 + s) + ".00",
                            "$15.00",
                            "$19.99",
                            null,
                            "tracking",
                            true,
                            "medium"
                    ),
                    "seed-history"
            );
        }

        // Page 1: scans first 10 items, updates stale status/discount on item 1 even though price stays $19.99,
        // replaces unverified user lowestEver ($9.99) with verified $19.99, counts all 10 new observations despite >=90 history,
        // and sets hasMore=true + nextCursor=10th item's id.
        MvcResult firstPass = mockMvc.perform(post("/api/me/wishlist/refresh")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scannedItems").value(10))
                .andExpect(jsonPath("$.matchedItems").value(10))
                .andExpect(jsonPath("$.updatedItems").value(10))
                .andExpect(jsonPath("$.observationsRecorded").value(10))
                .andExpect(jsonPath("$.hasMore").value(true))
                .andReturn();

        long nextCursor = objectMapper.readTree(firstPass.getResponse().getContentAsString())
                .path("nextCursor").longValue();
        assertTrue(nextCursor > 0 && nextCursor < eleventhItemId);

        // Verify item 1 cleared stale price-drop/-50% and ignored unverified $9.99 lowestEver.
        mockMvc.perform(get("/api/me/wishlist")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(firstItemId))
                .andExpect(jsonPath("$[0].status").value("tracking"))
                .andExpect(jsonPath("$[0].discount").isEmpty())
                .andExpect(jsonPath("$[0].lowestEver").value("$19.99"))
                .andExpect(jsonPath("$[0].priceSource").value("cheapshark-refresh"))
                .andExpect(jsonPath("$[0].lowestEverSource").value("cheapshark-refresh"));

        // Page 2 with cursor reaches item 11!
        mockMvc.perform(post("/api/me/wishlist/refresh")
                        .queryParam("cursor", String.valueOf(nextCursor))
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.scannedItems").value(1))
                .andExpect(jsonPath("$.matchedItems").value(1))
                .andExpect(jsonPath("$.updatedItems").value(1))
                .andExpect(jsonPath("$.hasMore").value(false))
                .andExpect(jsonPath("$.items[10].id").value(eleventhItemId))
                .andExpect(jsonPath("$.items[10].currentPrice").value("$12.99"))
                .andExpect(jsonPath("$.items[10].priceSource").value("cheapshark-refresh"));
    }

    @Test
    void rejectsConflictingCurrencyAndPreservesUnknownCurrencyForTba() throws Exception {
        String token = registerAndLogin(uniqueUser());

        mockMvc.perform(post("/api/me/wishlist")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Euro Game",
                                  "store": "Steam",
                                  "currentPrice": "€19.99",
                                  "targetPrice": "€12.00",
                                  "currency": "USD"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("validation_failed"));

        mockMvc.perform(post("/api/me/wishlist")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Tba Game",
                                  "store": "Steam",
                                  "currentPrice": "TBA",
                                  "targetPrice": "TBA"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.currency").value("UNKNOWN"))
                .andExpect(jsonPath("$.priceSource").value("user-entered"));
    }

    private String registerAndLogin(Credentials user) throws Exception {
        MvcResult csrfResult = mockMvc.perform(get("/api/auth/csrf")
                        .header(HttpHeaders.ORIGIN, "http://localhost:3000"))
                .andExpect(status().isOk())
                .andReturn();
        String csrfToken = objectMapper.readTree(csrfResult.getResponse().getContentAsString())
                .path("csrfToken").stringValue();
        String setCookie = csrfResult.getResponse().getHeader(HttpHeaders.SET_COOKIE);
        String[] cookieParts = setCookie.split(";", 2)[0].split("=", 2);
        Cookie csrfCookie = new Cookie(cookieParts[0], cookieParts[1]);

        mockMvc.perform(post("/api/auth/register")
                        .header(HttpHeaders.ORIGIN, "http://localhost:3000")
                        .header("X-NEXORA-CSRF", csrfToken)
                        .cookie(csrfCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "%s",
                                  "username": "%s",
                                  "displayName": "F6 Tester",
                                  "password": "%s"
                                }
                                """.formatted(user.email(), user.username(), user.password())))
                .andExpect(status().isCreated());

        MvcResult loginResult = mockMvc.perform(post("/api/auth/login")
                        .header(HttpHeaders.ORIGIN, "http://localhost:3000")
                        .header("X-NEXORA-CSRF", csrfToken)
                        .cookie(csrfCookie)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "emailOrUsername": "%s",
                                  "password": "%s"
                                }
                                """.formatted(user.username(), user.password())))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(loginResult.getResponse().getContentAsString())
                .path("token").stringValue();
    }

    private static Credentials uniqueUser() {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        return new Credentials(
                "f6-" + suffix + "@example.com",
                "f6_" + suffix,
                "strong-password-123");
    }

    private record Credentials(String email, String username, String password) {
    }
}
