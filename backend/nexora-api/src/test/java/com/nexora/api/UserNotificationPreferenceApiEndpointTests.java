package com.nexora.api;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.ObjectMapper;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "nexora.auth.abuse-controls.enabled=false")
@AutoConfigureMockMvc
class UserNotificationPreferenceApiEndpointTests {

    private static final String PREFERENCES_PATH = "/api/me/notification-preferences";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void preferencesRequireBearerAuthentication() throws Exception {
        mockMvc.perform(get(PREFERENCES_PATH))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("authentication_required"));

        mockMvc.perform(patch(PREFERENCES_PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailEnabled\":true}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("authentication_required"));
    }

    @Test
    void newUserReceivesSafeDefaults() throws Exception {
        String token = register(uniqueUser());

        mockMvc.perform(authenticatedGet(token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.emailEnabled").value(false))
                .andExpect(jsonPath("$.inAppEnabled").value(true))
                .andExpect(jsonPath("$.targetReachedEnabled").value(true))
                .andExpect(jsonPath("$.priceDropEnabled").value(true))
                .andExpect(jsonPath("$.freeGameEnabled").value(true));
    }

    @Test
    void partialPatchUpdatesOnlyProvidedPreferences() throws Exception {
        String token = register(uniqueUser());

        mockMvc.perform(authenticatedPatch(
                        token,
                        "{\"emailEnabled\":true,\"priceDropEnabled\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.emailEnabled").value(true))
                .andExpect(jsonPath("$.inAppEnabled").value(true))
                .andExpect(jsonPath("$.targetReachedEnabled").value(true))
                .andExpect(jsonPath("$.priceDropEnabled").value(false))
                .andExpect(jsonPath("$.freeGameEnabled").value(true));

        mockMvc.perform(authenticatedGet(token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.emailEnabled").value(true))
                .andExpect(jsonPath("$.priceDropEnabled").value(false));
    }

    @Test
    void preferencesRemainScopedToAuthenticatedUser() throws Exception {
        String firstToken = register(uniqueUser());
        String secondToken = register(uniqueUser());

        mockMvc.perform(authenticatedPatch(
                        firstToken,
                        "{\"inAppEnabled\":false,\"freeGameEnabled\":false}"))
                .andExpect(status().isOk());

        mockMvc.perform(authenticatedGet(firstToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.inAppEnabled").value(false))
                .andExpect(jsonPath("$.freeGameEnabled").value(false));
        mockMvc.perform(authenticatedGet(secondToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.inAppEnabled").value(true))
                .andExpect(jsonPath("$.freeGameEnabled").value(true));
    }

    @Test
    void emptyUnknownAndMalformedUpdatesAreRejectedSafely() throws Exception {
        String token = register(uniqueUser());

        mockMvc.perform(authenticatedPatch(token, "{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("validation_failed"))
                .andExpect(jsonPath("$.message")
                        .value("Notification preference validation failed"))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.path").value(PREFERENCES_PATH))
                .andExpect(jsonPath("$.timestampUtc").isNotEmpty());
        mockMvc.perform(authenticatedPatch(token, "{\"unknownPreference\":true}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("validation_failed"));
        mockMvc.perform(authenticatedPatch(
                        token,
                        "{\"emailEnabled\":{\"unexpected\":true}}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("validation_failed"));
    }

    private String register(Credentials user) throws Exception {
        CsrfContext csrf = csrfContext();
        MvcResult result = mockMvc.perform(authPost("/api/auth/register", csrf)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson(user)))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("token")
                .stringValue();
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
        return get(PREFERENCES_PATH)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
    }

    private static org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder
    authenticatedPatch(String token, String content) {
        return patch(PREFERENCES_PATH)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(content);
    }

    private static Credentials uniqueUser() {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        return new Credentials(
                "preferences-" + suffix + "@example.com",
                "preferences_" + suffix,
                "strong-password-123");
    }

    private static String registerJson(Credentials user) {
        return """
                {
                  "email": "%s",
                  "username": "%s",
                  "displayName": "Preference Tester",
                  "password": "%s"
                }
                """.formatted(user.email(), user.username(), user.password());
    }

    private record Credentials(String email, String username, String password) {
    }

    private record CsrfContext(String token, Cookie cookie) {
    }
}
