package com.nexora.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
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
    void newlyAuthenticatedUserStartsWithAnEmptyWishlist() throws Exception {
        String token = registerAndLogin(uniqueUser());

        mockMvc.perform(authenticatedGet(token))
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
                .andExpect(jsonPath("$.priority").value("medium"));

        mockMvc.perform(authenticatedGet(token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].title").value(title));

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
    }

    private long createdItemId(String token, String title) throws Exception {
        MvcResult result = mockMvc.perform(authenticatedPost(token, title))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).path("id").longValue();
    }

    private String registerAndLogin(Credentials user) throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson(user)))
                .andExpect(status().isCreated());

        MvcResult login = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(user)))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(login.getResponse().getContentAsString()).path("token").stringValue();
    }

    private static org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder
    authenticatedGet(String token) {
        return get("/api/me/wishlist").header("Authorization", "Bearer " + token);
    }

    private static org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder
    authenticatedPost(String token, String title) {
        return post("/api/me/wishlist")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {
                          "title": "%s",
                          "store": "Steam",
                          "currentPrice": "$39.99",
                          "targetPrice": "$24.99"
                        }
                        """.formatted(title));
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
}
