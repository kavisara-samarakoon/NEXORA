package com.nexora.api;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "nexora.auth.abuse-controls.enabled=false")
@AutoConfigureMockMvc
class UserWishlistApiEndpointTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void publicWishlistRemainsAvailableWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/api/wishlist"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(8))
                .andExpect(jsonPath("$[0].title").value("Ghost of Tsushima: Director's Cut"));
    }

    @Test
    void userWishlistRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/me/wishlist"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("authentication_required"));
    }

    @Test
    void updatingWishlistAlertRequiresAuthentication() throws Exception {
        mockMvc.perform(patch("/api/me/wishlist/1/alert")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"alertActive\":false}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("authentication_required"));
    }

    @Test
    void wishlistAlertHistoryRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/me/wishlist/alert-events"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("authentication_required"));
    }

    @Test
    void wishlistPriceHistoryRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/me/wishlist/1/price-history"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("authentication_required"));
    }

    @Test
    void creatingPersonalItemRecordsChartReadyInitialPriceHistory() throws Exception {
        String token = registerAndLogin(uniqueUser());
        String title = "History title " + UUID.randomUUID();
        MvcResult created = mockMvc.perform(authenticatedPost(
                        token, title, "Steam", "$19.99", "$10.00", true))
                .andExpect(status().isCreated())
                .andReturn();
        long itemId = objectMapper.readTree(created.getResponse().getContentAsString())
                .path("id").longValue();

        mockMvc.perform(authenticatedPriceHistoryGet(token, itemId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").isNumber())
                .andExpect(jsonPath("$[0].wishlistItemId").value(itemId))
                .andExpect(jsonPath("$[0].itemTitle").value(title))
                .andExpect(jsonPath("$[0].store").value("Steam"))
                .andExpect(jsonPath("$[0].priceLabel").value("$19.99"))
                .andExpect(jsonPath("$[0].priceAmount").value(19.99))
                .andExpect(jsonPath("$[0].currency").value("USD"))
                .andExpect(jsonPath("$[0].source").value("wishlist-create"))
                .andExpect(jsonPath("$[0].observedAt").isNotEmpty());
    }

    @Test
    void freeAndUnparseablePricesRemainSafeForHistoryConsumers() throws Exception {
        String token = registerAndLogin(uniqueUser());
        long freeId = createdItemId(token, "Free title " + UUID.randomUUID(), "Steam", "FREE");
        long tbaId = createdItemId(token, "TBA title " + UUID.randomUUID(), "GOG", "TBA");

        mockMvc.perform(authenticatedPriceHistoryGet(token, freeId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].priceLabel").value("FREE"))
                .andExpect(jsonPath("$[0].priceAmount").value(0.00))
                .andExpect(jsonPath("$[0].currency").value("USD"));
        mockMvc.perform(authenticatedPriceHistoryGet(token, tbaId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].priceLabel").value("TBA"))
                .andExpect(jsonPath("$[0].priceAmount").doesNotExist())
                .andExpect(jsonPath("$[0].currency").doesNotExist());
    }

    @Test
    void priceHistoryIsPrivateAndMissingItemsReturnNotFound() throws Exception {
        String ownerToken = registerAndLogin(uniqueUser());
        String secondUserToken = registerAndLogin(uniqueUser());
        long itemId = createdItemId(ownerToken, "Private history " + UUID.randomUUID());

        mockMvc.perform(authenticatedPriceHistoryGet(secondUserToken, itemId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("wishlist_item_not_found"));
        mockMvc.perform(authenticatedPriceHistoryGet(secondUserToken, 987654321L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("wishlist_item_not_found"));
    }

    @Test
    void softDeletedItemDoesNotExposeItsPriceHistory() throws Exception {
        String token = registerAndLogin(uniqueUser());
        long itemId = createdItemId(token, "Deleted history " + UUID.randomUUID());

        mockMvc.perform(delete("/api/me/wishlist/{id}", itemId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        mockMvc.perform(authenticatedPriceHistoryGet(token, itemId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("wishlist_item_not_found"));
    }

    @Test
    void duplicateSaveAndAlertUpdatesDoNotAddPriceHistory() throws Exception {
        String token = registerAndLogin(uniqueUser());
        String title = "Stable history " + UUID.randomUUID();
        long itemId = createdItemId(token, title, "Steam");

        mockMvc.perform(authenticatedPost(token, "  " + title + "  ", " steam "))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(itemId));
        mockMvc.perform(authenticatedPatch(
                        token, itemId,
                        "{\"targetPrice\":\"$12.00\",\"alertActive\":false,\"priority\":\"high\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(authenticatedPriceHistoryGet(token, itemId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].source").value("wishlist-create"));
    }

    @Test
    void newlyAuthenticatedUserStartsWithAnEmptyWishlist() throws Exception {
        String token = registerAndLogin(uniqueUser());

        mockMvc.perform(authenticatedGet(token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void newlyAuthenticatedUserStartsWithEmptyAlertHistory() throws Exception {
        String token = registerAndLogin(uniqueUser());

        mockMvc.perform(authenticatedAlertEventsGet(token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void creatingTargetReachedItemRecordsOneAlertEvent() throws Exception {
        String token = registerAndLogin(uniqueUser());
        String title = "Reached title " + UUID.randomUUID();

        MvcResult created = mockMvc.perform(authenticatedPost(
                        token, title, "Steam", "$8.88", "$9.99", true))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.alertEvaluation.state").value("target-reached"))
                .andReturn();
        long itemId = objectMapper.readTree(created.getResponse().getContentAsString())
                .path("id")
                .longValue();

        mockMvc.perform(authenticatedAlertEventsGet(token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").isNumber())
                .andExpect(jsonPath("$[0].wishlistItemId").value(itemId))
                .andExpect(jsonPath("$[0].itemTitle").value(title))
                .andExpect(jsonPath("$[0].store").value("Steam"))
                .andExpect(jsonPath("$[0].currentPrice").value("$8.88"))
                .andExpect(jsonPath("$[0].targetPrice").value("$9.99"))
                .andExpect(jsonPath("$[0].evaluationState").value("target-reached"))
                .andExpect(jsonPath("$[0].targetReached").value(true))
                .andExpect(jsonPath("$[0].message").value("Target price reached."))
                .andExpect(jsonPath("$[0].createdAt").isNotEmpty());
    }

    @Test
    void creatingWatchingItemDoesNotRecordAlertEvent() throws Exception {
        String token = registerAndLogin(uniqueUser());

        mockMvc.perform(authenticatedPost(token, "Watching title " + UUID.randomUUID()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.alertEvaluation.state").value("watching"));

        mockMvc.perform(authenticatedAlertEventsGet(token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void alertHistoryRecordsOnlyTransitionsToTargetReached() throws Exception {
        String token = registerAndLogin(uniqueUser());
        long itemId = createdItemId(token, "Transition title " + UUID.randomUUID());

        mockMvc.perform(authenticatedPatch(token, itemId, "{\"targetPrice\":\"$49.99\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.alertEvaluation.state").value("target-reached"));
        mockMvc.perform(authenticatedAlertEventsGet(token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].wishlistItemId").value(itemId));

        mockMvc.perform(authenticatedPatch(token, itemId, "{\"targetPrice\":\"$59.99\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.alertEvaluation.state").value("target-reached"));
        mockMvc.perform(authenticatedPatch(token, itemId, "{\"priority\":\"high\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(authenticatedAlertEventsGet(token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        mockMvc.perform(authenticatedPatch(token, itemId, "{\"alertActive\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.alertEvaluation.state").value("paused"));
        mockMvc.perform(authenticatedAlertEventsGet(token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void pausingWatchingItemDoesNotRecordAlertEvent() throws Exception {
        String token = registerAndLogin(uniqueUser());
        long itemId = createdItemId(token, "Paused title " + UUID.randomUUID());

        mockMvc.perform(authenticatedPatch(token, itemId, "{\"alertActive\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.alertEvaluation.state").value("paused"));

        mockMvc.perform(authenticatedAlertEventsGet(token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void alertHistoryIsPrivateToAuthenticatedOwner() throws Exception {
        String ownerToken = registerAndLogin(uniqueUser());
        String secondUserToken = registerAndLogin(uniqueUser());
        mockMvc.perform(authenticatedPost(
                        ownerToken,
                        "Private reached title " + UUID.randomUUID(),
                        "Steam",
                        "$8.88",
                        "$9.99",
                        true))
                .andExpect(status().isCreated());

        mockMvc.perform(authenticatedAlertEventsGet(ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
        mockMvc.perform(authenticatedAlertEventsGet(secondUserToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void softDeletedItemCannotCreateOrExposeANewAlertEvent() throws Exception {
        String token = registerAndLogin(uniqueUser());
        long itemId = createdItemId(token, "Deleted watching title " + UUID.randomUUID());

        mockMvc.perform(delete("/api/me/wishlist/{id}", itemId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        mockMvc.perform(authenticatedPatch(token, itemId, "{\"targetPrice\":\"$49.99\"}"))
                .andExpect(status().isNotFound());
        mockMvc.perform(authenticatedAlertEventsGet(token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void authenticatedUserCanCreateAndListAnItemWithoutChangingPublicWishlist() throws Exception {
        String token = registerAndLogin(uniqueUser());
        String title = "User title " + UUID.randomUUID();

        mockMvc.perform(authenticatedPost(token, title))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.title").value(title))
                .andExpect(jsonPath("$.store").value("Steam"))
                .andExpect(jsonPath("$.currentPrice").value("$39.99"))
                .andExpect(jsonPath("$.targetPrice").value("$24.99"))
                .andExpect(jsonPath("$.lowestEver").value("$39.99"))
                .andExpect(jsonPath("$.discount").doesNotExist())
                .andExpect(jsonPath("$.status").value("tracking"))
                .andExpect(jsonPath("$.alertActive").value(true))
                .andExpect(jsonPath("$.priority").value("medium"))
                .andExpect(jsonPath("$.alertEvaluation.targetReached").value(false))
                .andExpect(jsonPath("$.alertEvaluation.state").value("watching"));

        mockMvc.perform(authenticatedGet(token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].title").value(title))
                .andExpect(jsonPath("$[0].alertEvaluation.state").value("watching"));

        MvcResult publicWishlist = mockMvc.perform(get("/api/wishlist"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(8))
                .andReturn();
        JsonNode publicItems = objectMapper.readTree(publicWishlist.getResponse().getContentAsString());
        for (JsonNode item : publicItems) {
            assertFalse(title.equals(item.path("title").stringValue()));
        }
    }

    @Test
    void repeatedNormalizedSaveReturnsExistingItemWithoutCreatingDuplicate() throws Exception {
        String token = registerAndLogin(uniqueUser());
        String title = "Duplicate title " + UUID.randomUUID();
        long firstId = createdItemId(token, title, "Fanatical");

        MvcResult duplicate = mockMvc.perform(authenticatedPost(
                        token,
                        "  " + title.toUpperCase() + "  ",
                        "  fanatical  "))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(firstId))
                .andExpect(jsonPath("$.title").value(title))
                .andExpect(jsonPath("$.store").value("Fanatical"))
                .andReturn();

        long duplicateId = objectMapper.readTree(duplicate.getResponse().getContentAsString())
                .path("id")
                .longValue();
        mockMvc.perform(authenticatedGet(token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        assertEquals(firstId, duplicateId);
    }

    @Test
    void duplicateIdentityIsScopedByUserAndStore() throws Exception {
        String firstUserToken = registerAndLogin(uniqueUser());
        String secondUserToken = registerAndLogin(uniqueUser());
        String title = "Shared title " + UUID.randomUUID();

        long steamId = createdItemId(firstUserToken, title, "Steam");
        long gogId = createdItemId(firstUserToken, title, "GOG");
        long secondUserId = createdItemId(secondUserToken, title, "Steam");

        assertNotEquals(steamId, gogId);
        assertNotEquals(steamId, secondUserId);
        mockMvc.perform(authenticatedGet(firstUserToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
        mockMvc.perform(authenticatedGet(secondUserToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void onlyTheOwnerCanSeeAndSoftDeleteAnItem() throws Exception {
        String ownerToken = registerAndLogin(uniqueUser());
        String secondUserToken = registerAndLogin(uniqueUser());
        String title = "Private title " + UUID.randomUUID();
        long itemId = createdItemId(ownerToken, title);

        mockMvc.perform(authenticatedGet(secondUserToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(delete("/api/me/wishlist/{id}", itemId)
                        .header("Authorization", "Bearer " + secondUserToken))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("wishlist_item_not_found"));

        mockMvc.perform(authenticatedGet(ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(itemId));

        mockMvc.perform(delete("/api/me/wishlist/{id}", itemId)
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(authenticatedGet(ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        mockMvc.perform(delete("/api/me/wishlist/{id}", itemId)
                        .header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void ownerCanUpdateAllAlertSettingsAndValuesAreTrimmed() throws Exception {
        String token = registerAndLogin(uniqueUser());
        long itemId = createdItemId(token, "Alert update " + UUID.randomUUID());

        mockMvc.perform(authenticatedPatch(token, itemId, """
                        {
                          "targetPrice": "  $9.99  ",
                          "alertActive": false,
                          "priority": "  high  "
                        }
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(itemId))
                .andExpect(jsonPath("$.targetPrice").value("$9.99"))
                .andExpect(jsonPath("$.alertActive").value(false))
                .andExpect(jsonPath("$.priority").value("high"));

        mockMvc.perform(authenticatedGet(token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(itemId))
                .andExpect(jsonPath("$[0].targetPrice").value("$9.99"))
                .andExpect(jsonPath("$[0].alertActive").value(false))
                .andExpect(jsonPath("$[0].priority").value("high"));
    }

    @Test
    void partialAlertUpdateKeepsOmittedValues() throws Exception {
        String token = registerAndLogin(uniqueUser());
        long itemId = createdItemId(token, "Partial alert " + UUID.randomUUID());

        mockMvc.perform(authenticatedPatch(token, itemId, "{\"alertActive\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.targetPrice").value("$24.99"))
                .andExpect(jsonPath("$.alertActive").value(false))
                .andExpect(jsonPath("$.priority").value("medium"));
    }

    @Test
    void alertUpdateRecalculatesEvaluation() throws Exception {
        String token = registerAndLogin(uniqueUser());
        long itemId = createdItemId(token, "Evaluation update " + UUID.randomUUID());

        mockMvc.perform(authenticatedPatch(token, itemId, "{\"targetPrice\":\"$49.99\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.alertEvaluation.targetReached").value(true))
                .andExpect(jsonPath("$.alertEvaluation.state").value("target-reached"))
                .andExpect(jsonPath("$.alertEvaluation.message").value("Target price reached."));

        mockMvc.perform(authenticatedPatch(token, itemId, "{\"alertActive\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.alertEvaluation.targetReached").value(false))
                .andExpect(jsonPath("$.alertEvaluation.state").value("paused"))
                .andExpect(jsonPath("$.alertEvaluation.message").value("Alert is paused."));
    }

    @Test
    void invalidAlertUpdatesReturnValidationFailed() throws Exception {
        String token = registerAndLogin(uniqueUser());
        long itemId = createdItemId(token, "Invalid alert " + UUID.randomUUID());

        mockMvc.perform(authenticatedPatch(token, itemId, "{\"priority\":\"urgent\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("validation_failed"));

        mockMvc.perform(authenticatedPatch(token, itemId, "{\"targetPrice\":\"   \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("validation_failed"));

        mockMvc.perform(authenticatedPatch(token, itemId, "{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("validation_failed"));
    }

    @Test
    void anotherUserCannotUpdateWishlistAlert() throws Exception {
        String ownerToken = registerAndLogin(uniqueUser());
        String secondUserToken = registerAndLogin(uniqueUser());
        long itemId = createdItemId(ownerToken, "Owned alert " + UUID.randomUUID());

        mockMvc.perform(authenticatedPatch(secondUserToken, itemId, "{\"alertActive\":false}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("wishlist_item_not_found"));

        mockMvc.perform(authenticatedGet(ownerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].alertActive").value(true));
    }

    @Test
    void softDeletedWishlistItemAlertCannotBeUpdated() throws Exception {
        String token = registerAndLogin(uniqueUser());
        long itemId = createdItemId(token, "Deleted alert " + UUID.randomUUID());
        mockMvc.perform(delete("/api/me/wishlist/{id}", itemId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(authenticatedPatch(token, itemId, "{\"priority\":\"low\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("wishlist_item_not_found"));
    }

    @Test
    void invalidWishlistValuesReturnCleanValidationError() throws Exception {
        String token = registerAndLogin(uniqueUser());

        mockMvc.perform(post("/api/me/wishlist")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "",
                                  "store": "Steam",
                                  "currentPrice": "$39.99",
                                  "targetPrice": "$24.99",
                                  "status": "unknown",
                                  "priority": "urgent"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("validation_failed"))
                .andExpect(jsonPath("$.message").isNotEmpty());

        mockMvc.perform(post("/api/me/wishlist")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Valid title",
                                  "store": "   ",
                                  "currentPrice": "$39.99",
                                  "targetPrice": "$24.99"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("validation_failed"));
    }

    private long createdItemId(String token, String title) throws Exception {
        return createdItemId(token, title, "Steam");
    }

    private long createdItemId(String token, String title, String store) throws Exception {
        MvcResult result = mockMvc.perform(authenticatedPost(token, title, store))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).path("id").longValue();
    }

    private long createdItemId(
            String token,
            String title,
            String store,
            String currentPrice) throws Exception {
        MvcResult result = mockMvc.perform(authenticatedPost(
                        token, title, store, currentPrice, "$24.99", true))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("id").longValue();
    }

    private String registerAndLogin(Credentials user) throws Exception {
        CsrfContext csrf = csrfContext();
        mockMvc.perform(authPost("/api/auth/register", csrf)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson(user)))
                .andExpect(status().isCreated());

        MvcResult login = mockMvc.perform(authPost("/api/auth/login", csrf)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(user)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(login.getResponse().getContentAsString()).path("token").stringValue();
    }

    private CsrfContext csrfContext() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/auth/csrf")
                        .header(HttpHeaders.ORIGIN, "http://localhost:3000"))
                .andExpect(status().isOk())
                .andReturn();
        String token = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("csrfToken")
                .stringValue();
        String setCookie = result.getResponse().getHeader(HttpHeaders.SET_COOKIE);
        String[] nameAndValue = setCookie.split(";", 2)[0].split("=", 2);
        return new CsrfContext(token, new Cookie(nameAndValue[0], nameAndValue[1]));
    }

    private static org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder
    authPost(String path, CsrfContext csrf) {
        return post(path)
                .header(HttpHeaders.ORIGIN, "http://localhost:3000")
                .header("X-NEXORA-CSRF", csrf.token())
                .cookie(csrf.cookie());
    }

    private static org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder
    authenticatedGet(String token) {
        return get("/api/me/wishlist").header("Authorization", "Bearer " + token);
    }

    private static org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder
    authenticatedPost(String token, String title) {
        return authenticatedPost(token, title, "Steam");
    }

    private static org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder
    authenticatedPost(String token, String title, String store) {
        return authenticatedPost(token, title, store, "$39.99", "$24.99", true);
    }

    private static org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder
    authenticatedPost(
            String token,
            String title,
            String store,
            String currentPrice,
            String targetPrice,
            boolean alertActive) {
        return post("/api/me/wishlist")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "title": "%s",
                          "store": "%s",
                          "currentPrice": "%s",
                          "targetPrice": "%s",
                          "alertActive": %s
                        }
                        """.formatted(
                                title,
                                store,
                                currentPrice,
                                targetPrice,
                                alertActive));
    }

    private static org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder
    authenticatedPatch(String token, long itemId, String content) {
        return patch("/api/me/wishlist/{id}/alert", itemId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(content);
    }

    private static org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder
    authenticatedAlertEventsGet(String token) {
        return get("/api/me/wishlist/alert-events")
                .header("Authorization", "Bearer " + token);
    }

    private static org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder
    authenticatedPriceHistoryGet(String token, long itemId) {
        return get("/api/me/wishlist/{id}/price-history", itemId)
                .header("Authorization", "Bearer " + token);
    }

    private static Credentials uniqueUser() {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        return new Credentials(
                "wishlist-" + suffix + "@example.com",
                "wishlist_" + suffix,
                "strong-password-123");
    }

    private static String registerJson(Credentials user) {
        return """
                {
                  "email": "%s",
                  "username": "%s",
                  "displayName": "Wishlist Tester",
                  "password": "%s"
                }
                """.formatted(user.email(), user.username(), user.password());
    }

    private static String loginJson(Credentials user) {
        return """
                {
                  "emailOrUsername": "%s",
                  "password": "%s"
                }
                """.formatted(user.username(), user.password());
    }

    private record Credentials(String email, String username, String password) {
    }

    private record CsrfContext(String token, Cookie cookie) {
    }
}
