package com.nexora.api;

import com.nexora.api.sentinel.gateway.GeminiSentinelClient;
import jakarta.servlet.http.Cookie;
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

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "nexora.sentinel.ai.provider=gemini",
        "nexora.sentinel.ai.gemini.api-key=test-only-placeholder",
        "nexora.auth.abuse-controls.enabled=false"
})
@AutoConfigureMockMvc
class SentinelGeminiGatewayApiEndpointTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private GeminiSentinelClient geminiClient;

    @Test
    void configuredGeminiEndpointReturnsGeminiProviderResponse() throws Exception {
        when(geminiClient.generateText(any()))
                .thenReturn("Check the current official store price before purchasing.");
        String token = register();

        mockMvc.perform(post("/api/me/sentinel/insight")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"Should I buy now?\",\"context\":\"deals\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("gemini-provider-foundation"))
                .andExpect(jsonPath("$.provider").value("gemini"))
                .andExpect(jsonPath("$.fallbackReason").isEmpty())
                .andExpect(jsonPath("$.answer")
                        .value("Check the current official store price before purchasing."));

        mockMvc.perform(get("/api/sentinel/status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.aiStatus").value("External AI ready"))
                .andExpect(jsonPath("$.geminiApi").value("Gemini enabled"));
    }

    private String register() throws Exception {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        CsrfContext csrf = csrfContext();
        String body = """
                {
                  "email": "gemini-%s@example.com",
                  "username": "gemini_%s",
                  "displayName": "Gemini Tester",
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

    private record CsrfContext(String token, Cookie cookie) {
    }
}
