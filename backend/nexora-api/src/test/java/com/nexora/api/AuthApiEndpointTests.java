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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AuthApiEndpointTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void registerReturnsTokenAndSafeUser() throws Exception {
        Credentials user = uniqueUser();

        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson(user)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.user.id").isNumber())
                .andExpect(jsonPath("$.user.email").value(user.email()))
                .andExpect(jsonPath("$.user.username").value(user.username()))
                .andExpect(jsonPath("$.user.displayName").value("NEXORA Tester"))
                .andExpect(jsonPath("$.user.passwordHash").doesNotExist())
                .andReturn();

        assertIssuedRefreshCookie(result);
    }

    @Test
    void duplicateEmailOrUsernameIsRejected() throws Exception {
        Credentials user = uniqueUser();
        register(user);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson(new Credentials(user.email(), user.username() + "x", user.password()))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("account_conflict"));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson(new Credentials("other-" + user.email(), user.username(), user.password()))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("account_conflict"));
    }

    @Test
    void loginWorksWithEmailOrUsername() throws Exception {
        Credentials user = uniqueUser();
        register(user);

        MvcResult emailLogin = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(user.email().toUpperCase(), user.password())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.user.email").value(user.email()))
                .andReturn();
        assertIssuedRefreshCookie(emailLogin);

        MvcResult usernameLogin = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(user.username(), user.password())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.user.username").value(user.username()))
                .andReturn();
        assertIssuedRefreshCookie(usernameLogin);
    }

    @Test
    void loginRejectsInvalidPassword() throws Exception {
        Credentials user = uniqueUser();
        register(user);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(user.email(), "definitely-wrong")))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("authentication_failed"));
    }

    @Test
    void meRequiresTokenAndReturnsAuthenticatedUser() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("authentication_required"));

        Credentials user = uniqueUser();
        String token = objectMapper.readTree(register(user).getResponse().getContentAsString())
                .path("token")
                .stringValue();

        mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(user.email()))
                .andExpect(jsonPath("$.username").value(user.username()))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    void validRefreshCookieRotatesSessionAndReturnsFreshAuthResponse() throws Exception {
        Credentials user = uniqueUser();
        MvcResult registered = register(user);
        Cookie originalCookie = refreshCookie(registered);
        String originalAccessToken = objectMapper.readTree(registered.getResponse().getContentAsString())
                .path("token")
                .stringValue();

        MvcResult refreshed = mockMvc.perform(post("/api/auth/refresh").cookie(originalCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.user.email").value(user.email()))
                .andExpect(jsonPath("$.user.username").value(user.username()))
                .andExpect(jsonPath("$.user.passwordHash").doesNotExist())
                .andReturn();

        Cookie successorCookie = refreshCookie(refreshed);
        assertIssuedRefreshCookie(refreshed);
        assertNotEquals(originalCookie.getValue(), successorCookie.getValue());

        String refreshedAccessToken = objectMapper.readTree(refreshed.getResponse().getContentAsString())
                .path("token")
                .stringValue();
        assertNotEquals(originalAccessToken, refreshedAccessToken);
        mockMvc.perform(get("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + refreshedAccessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(user.email()));
    }

    @Test
    void rotatedRefreshCookieCannotBeReused() throws Exception {
        Cookie originalCookie = refreshCookie(register(uniqueUser()));

        mockMvc.perform(post("/api/auth/refresh").cookie(originalCookie))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/auth/refresh").cookie(originalCookie))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("authentication_failed"));
    }

    @Test
    void refreshRequiresCookie() throws Exception {
        mockMvc.perform(post("/api/auth/refresh"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("authentication_failed"));
    }

    @Test
    void logoutRevokesSessionClearsCookieAndIsIdempotent() throws Exception {
        Cookie refreshCookie = refreshCookie(register(uniqueUser()));

        MvcResult logout = mockMvc.perform(post("/api/auth/logout").cookie(refreshCookie))
                .andExpect(status().isNoContent())
                .andReturn();
        assertClearedRefreshCookie(logout);

        mockMvc.perform(post("/api/auth/refresh").cookie(refreshCookie))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("authentication_failed"));

        MvcResult repeatedLogout = mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isNoContent())
                .andReturn();
        assertClearedRefreshCookie(repeatedLogout);
    }

    @Test
    void healthRemainsPublicWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.service").value("NEXORA API"));
    }

    private MvcResult register(Credentials user) throws Exception {
        return mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson(user)))
                .andExpect(status().isCreated())
                .andReturn();
    }

    private static Credentials uniqueUser() {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        return new Credentials("tester-" + suffix + "@example.com", "tester_" + suffix, "strong-password-123");
    }

    private static String registerJson(Credentials user) {
        return """
                {
                  "email": "%s",
                  "username": "%s",
                  "displayName": "NEXORA Tester",
                  "password": "%s"
                }
                """.formatted(user.email(), user.username(), user.password());
    }

    private static String loginJson(String identifier, String password) {
        return """
                {
                  "emailOrUsername": "%s",
                  "password": "%s"
                }
                """.formatted(identifier, password);
    }

    private static Cookie refreshCookie(MvcResult result) {
        String setCookie = result.getResponse().getHeader(HttpHeaders.SET_COOKIE);
        assertNotNull(setCookie);
        String[] nameAndValue = setCookie.split(";", 2)[0].split("=", 2);
        return new Cookie(nameAndValue[0], nameAndValue.length == 2 ? nameAndValue[1] : "");
    }

    private static void assertIssuedRefreshCookie(MvcResult result) {
        String setCookie = result.getResponse().getHeader(HttpHeaders.SET_COOKIE);
        assertNotNull(setCookie);
        assertTrue(setCookie.startsWith("nexora_refresh_token="));
        assertTrue(setCookie.contains("Path=/api/auth"));
        assertTrue(setCookie.contains("Max-Age=604800"));
        assertTrue(setCookie.contains("HttpOnly"));
        assertTrue(setCookie.contains("SameSite=Lax"));
        assertFalse(setCookie.contains("Secure"));
        assertFalse(refreshCookie(result).getValue().isBlank());
    }

    private static void assertClearedRefreshCookie(MvcResult result) {
        String setCookie = result.getResponse().getHeader(HttpHeaders.SET_COOKIE);
        assertNotNull(setCookie);
        assertTrue(setCookie.startsWith("nexora_refresh_token="));
        assertTrue(setCookie.contains("Path=/api/auth"));
        assertTrue(setCookie.contains("Max-Age=0"));
        assertTrue(setCookie.contains("HttpOnly"));
        assertTrue(setCookie.contains("SameSite=Lax"));
    }

    private record Credentials(String email, String username, String password) {
    }
}
