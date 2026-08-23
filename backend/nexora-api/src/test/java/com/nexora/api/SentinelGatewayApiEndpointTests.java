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

import java.util.Map;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SentinelGatewayApiEndpointTests {

    private static final String INSIGHT_PATH = "/api/me/sentinel/insight";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void insightRequiresBearerAuthentication() throws Exception {
        mockMvc.perform(post(INSIGHT_PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"Give me local guidance\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("authentication_required"));
    }

    @Test
    void authenticatedInsightUsesLocalFoundationProvider() throws Exception {
        String token = register();

        mockMvc.perform(insightRequest(
                        token,
                        "{\"message\":\"Should I buy this game now?\",\"context\":\"deals\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("local-foundation"))
                .andExpect(jsonPath("$.provider").value("local"))
                .andExpect(jsonPath("$.context").value("deals"))
                .andExpect(jsonPath("$.title").value("Sentinel Gateway Preview"))
                .andExpect(jsonPath("$.answer").value(
                        org.hamcrest.Matchers.containsString("No external AI")))
                .andExpect(jsonPath("$.recommendations.length()")
                        .value(org.hamcrest.Matchers.greaterThan(0)))
                .andExpect(jsonPath("$.safetyNotes[0]")
                        .value("No external AI provider is active."))
                .andExpect(jsonPath("$.nextActions.length()")
                        .value(org.hamcrest.Matchers.greaterThan(0)))
                .andExpect(jsonPath("$.createdAt").isNotEmpty());
    }

    @Test
    void omittedContextDefaultsToGeneral() throws Exception {
        String token = register();

        mockMvc.perform(insightRequest(
                        token,
                        "{\"message\":\"What can this gateway do?\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.context").value("general"))
                .andExpect(jsonPath("$.answer")
                        .value(org.hamcrest.Matchers.containsString("deterministic local gateway")));
    }

    @Test
    void blankAndOverlongMessagesAreRejected() throws Exception {
        String token = register();

        mockMvc.perform(insightRequest(
                        token,
                        "{\"message\":\"   \",\"context\":\"general\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("validation_failed"));

        String overlong = objectMapper.writeValueAsString(Map.of(
                "message", "x".repeat(501),
                "context", "general"));
        mockMvc.perform(insightRequest(token, overlong))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("validation_failed"));
    }

    @Test
    void unknownContextIsRejectedSafely() throws Exception {
        String token = register();

        mockMvc.perform(insightRequest(
                        token,
                        "{\"message\":\"Help\",\"context\":\"provider-secret\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("validation_failed"))
                .andExpect(jsonPath("$.message")
                        .value("The Sentinel gateway request could not be validated"));
    }

    private String register() throws Exception {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        CsrfContext csrf = csrfContext();
        String body = """
                {
                  "email": "sentinel-%s@example.com",
                  "username": "sentinel_%s",
                  "displayName": "Sentinel Tester",
                  "password": "strong-password-123"
                }
                """.formatted(suffix, suffix);
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .header(HttpHeaders.ORIGIN, "http://localhost:3000")
                        .header("X-NEXORA-CSRF", csrf.token())
                        .cookie(csrf.cookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
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
    insightRequest(String token, String content) {
        return post(INSIGHT_PATH)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(content);
    }

    private record CsrfContext(String token, Cookie cookie) {
    }
}
