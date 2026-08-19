package com.nexora.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.ObjectMapper;

import java.util.UUID;

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

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson(user)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.user.id").isNumber())
                .andExpect(jsonPath("$.user.email").value(user.email()))
                .andExpect(jsonPath("$.user.username").value(user.username()))
                .andExpect(jsonPath("$.user.displayName").value("NEXORA Tester"))
                .andExpect(jsonPath("$.user.passwordHash").doesNotExist());
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

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(user.email().toUpperCase(), user.password())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.email").value(user.email()));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(user.username(), user.password())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.user.username").value(user.username()));
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

    private record Credentials(String email, String username, String password) {
    }
}
