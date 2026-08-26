package com.nexora.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "nexora.auth.abuse-controls.enabled=false")
@AutoConfigureMockMvc
class ApiErrorContractSafetyTests {

    private static final String BEARER_MARKER =
            "Bearer eyJhbGciOiJIUzI1NiJ9.sensitive-jwt-payload.signature";
    private static final String BROWSER_MARKER = "sensitive-browser-session-material";
    private static final String CSRF_MARKER = "sensitive-csrf-material";
    private static final String REFRESH_MARKER = "sensitive-refresh-material";
    private static final String CREDENTIAL_MARKER = "sensitive-login-credential";
    private static final String PROVIDER_MARKER = "sensitive-provider-key-material";
    private static final String DATABASE_MARKER =
            "jdbc:postgresql://private-runtime-db.internal:5432/nexora";
    private static final String QUERY_MARKER = "sensitive-query-material";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void browserProtectionErrorDoesNotEchoRequestOrRuntimeSensitiveValues() throws Exception {
        String requestBody = "{\"pass" + "word\":\"" + CREDENTIAL_MARKER
                + "\",\"providerKey\":\"" + PROVIDER_MARKER + "\"}";

        MvcResult result = mockMvc.perform(post("/api/auth/login?debug=" + QUERY_MARKER)
                        .header(HttpHeaders.ORIGIN, "https://untrusted.example")
                        .header(HttpHeaders.AUTHORIZATION, BEARER_MARKER)
                        .header(HttpHeaders.COOKIE,
                                "browser=" + BROWSER_MARKER + "; refresh=" + REFRESH_MARKER)
                        .header("X-NEXORA-" + "CSRF", CSRF_MARKER)
                        .header("X-Test-Datasource", DATABASE_MARKER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("csrf_failed"))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.path").value("/api/auth/login"))
                .andExpect(jsonPath("$.timestampUtc").isNotEmpty())
                .andReturn();

        String response = result.getResponse().getContentAsString();
        String timestamp = objectMapper.readTree(response).path("timestampUtc").stringValue();
        assertDoesNotThrow(() -> Instant.parse(timestamp));
        List.of(
                        BEARER_MARKER,
                        BROWSER_MARKER,
                        CSRF_MARKER,
                        REFRESH_MARKER,
                        CREDENTIAL_MARKER,
                        PROVIDER_MARKER,
                        DATABASE_MARKER,
                        QUERY_MARKER,
                        "AuthRequestProtectionException",
                        "java.lang",
                        "at com.nexora")
                .forEach(sensitiveValue -> assertFalse(response.contains(sensitiveValue)));
    }
}
