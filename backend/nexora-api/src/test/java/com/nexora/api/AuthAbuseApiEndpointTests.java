package com.nexora.api;

import com.nexora.api.auth.events.AuthSecurityEvent;
import com.nexora.api.auth.events.AuthSecurityEventOutcome;
import com.nexora.api.auth.events.AuthSecurityEventStore;
import com.nexora.api.auth.events.AuthSecurityEventType;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "nexora.auth.abuse-controls.window-seconds=60",
        "nexora.auth.abuse-controls.register-max-attempts=1",
        "nexora.auth.abuse-controls.login-max-attempts=1",
        "nexora.auth.abuse-controls.refresh-max-attempts=1",
        "nexora.auth.abuse-controls.logout-max-attempts=1",
        "nexora.auth.abuse-controls.rejection-max-attempts=1"
})
@AutoConfigureMockMvc
class AuthAbuseApiEndpointTests {

    private static final String TRUSTED_ORIGIN = "http://localhost:3000";
    private static final String CSRF_HEADER = "X-NEXORA-CSRF";
    private static final String SAFE_MESSAGE =
            "Too many authentication attempts. Please wait before trying again.";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private AuthSecurityEventStore securityEventStore;

    @Test
    void scopedLoginAndRegistrationBucketsPreserveSafeAuthLimitResponses() throws Exception {
        CsrfContext csrf = csrfContext();

        expectOriginFailure(authPostFromOrigin("/api/auth/login", csrf, "https://attacker.example")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson("not-recorded@example.com", "not-recorded-password")));
        expectRateLimited(authPostFromOrigin("/api/auth/login", csrf, "https://attacker.example")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson("still-not-recorded@example.com", "still-not-recorded-password")));

        Credentials firstUser = uniqueUser();
        MvcResult registered = mockMvc.perform(authPost("/api/auth/register", csrf)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson(firstUser)))
                .andExpect(status().isCreated())
                .andReturn();
        expectRateLimited(authPost("/api/auth/register", csrf)
                .contentType(MediaType.APPLICATION_JSON)
                .content(registerJson(firstUser)));

        Credentials secondUser = uniqueUser();
        mockMvc.perform(authPost("/api/auth/register", csrf)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson(secondUser)))
                .andExpect(status().isCreated());

        mockMvc.perform(authPost("/api/auth/login", csrf)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(firstUser.email(), firstUser.password())))
                .andExpect(status().isOk());
        expectRateLimited(authPost("/api/auth/login", csrf)
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson(firstUser.email(), "not-the-password")));
        mockMvc.perform(authPost("/api/auth/login", csrf)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(secondUser.email(), secondUser.password())))
                .andExpect(status().isOk());

        MvcResult refreshed = mockMvc.perform(authPost("/api/auth/refresh", csrf)
                        .cookie(refreshCookie(registered)))
                .andExpect(status().isOk())
                .andReturn();
        Cookie rotatedRefreshCookie = refreshCookie(refreshed);
        expectRateLimited(authPost("/api/auth/refresh", csrf).cookie(rotatedRefreshCookie));

        mockMvc.perform(authPost("/api/auth/logout", csrf).cookie(rotatedRefreshCookie))
                .andExpect(status().isNoContent());
        expectRateLimited(authPost("/api/auth/logout", csrf).cookie(rotatedRefreshCookie));

        List<AuthSecurityEvent> rateLimitedEvents = securityEventStore.findAll().stream()
                .filter(event -> event.getEventType() == AuthSecurityEventType.AUTH_RATE_LIMITED)
                .toList();
        assertEquals(5, rateLimitedEvents.size());
        assertEquals(
                Set.of(
                        "auth_rejection_rate_limited",
                        "register_rate_limited",
                        "login_rate_limited",
                        "refresh_rate_limited",
                        "logout_rate_limited"),
                rateLimitedEvents.stream()
                        .map(AuthSecurityEvent::getReasonCode)
                        .collect(java.util.stream.Collectors.toSet()));
        for (AuthSecurityEvent event : rateLimitedEvents) {
            assertEquals(AuthSecurityEventOutcome.REJECTED, event.getOutcome());
            assertNull(event.getUserId());
            assertEquals("auth", event.getSource());
            assertNotNull(event.getOccurredAt());
            assertNotNull(event.getCreatedAt());
        }
    }

    private void expectRateLimited(MockHttpServletRequestBuilder request) throws Exception {
        MvcResult result = mockMvc.perform(request)
                .andExpect(status().isTooManyRequests())
                .andExpect(header().exists(HttpHeaders.RETRY_AFTER))
                .andExpect(jsonPath("$.error").value("rate_limited"))
                .andExpect(jsonPath("$.message").value(SAFE_MESSAGE))
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.path").isNotEmpty())
                .andExpect(jsonPath("$.timestampUtc").isNotEmpty())
                .andExpect(jsonPath("$.retryAfterSeconds").isNumber())
                .andReturn();

        long retryAfterHeader = Long.parseLong(result.getResponse().getHeader(HttpHeaders.RETRY_AFTER));
        long retryAfterBody = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("retryAfterSeconds")
                .asLong();
        assertTrue(retryAfterHeader > 0);
        assertEquals(retryAfterHeader, retryAfterBody);
    }

    private void expectOriginFailure(MockHttpServletRequestBuilder request) throws Exception {
        mockMvc.perform(request)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("csrf_failed"))
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.path").isNotEmpty())
                .andExpect(jsonPath("$.timestampUtc").isNotEmpty());
    }

    private CsrfContext csrfContext() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/auth/csrf")
                        .header(HttpHeaders.ORIGIN, TRUSTED_ORIGIN))
                .andExpect(status().isOk())
                .andReturn();
        String token = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("csrfToken")
                .stringValue();
        return new CsrfContext(token, cookieFromSetCookie(
                result.getResponse().getHeader(HttpHeaders.SET_COOKIE)));
    }

    private static MockHttpServletRequestBuilder authPost(String path, CsrfContext csrf) {
        return authPostFromOrigin(path, csrf, TRUSTED_ORIGIN);
    }

    private static MockHttpServletRequestBuilder authPostFromOrigin(
            String path,
            CsrfContext csrf,
            String origin) {
        return post(path)
                .header(HttpHeaders.ORIGIN, origin)
                .header(CSRF_HEADER, csrf.token())
                .cookie(csrf.cookie());
    }

    private static Credentials uniqueUser() {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        return new Credentials(
                "abuse-" + suffix + "@example.com",
                "abuse_" + suffix,
                "strong-password-123");
    }

    private static String registerJson(Credentials user) {
        return """
                {
                  "email": "%s",
                  "username": "%s",
                  "displayName": "NEXORA Abuse Test",
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
        return cookieFromSetCookie(result.getResponse().getHeader(HttpHeaders.SET_COOKIE));
    }

    private static Cookie cookieFromSetCookie(String setCookie) {
        assertNotNull(setCookie);
        String[] nameAndValue = setCookie.split(";", 2)[0].split("=", 2);
        Cookie cookie = new Cookie(nameAndValue[0], nameAndValue.length == 2 ? nameAndValue[1] : "");
        assertFalse(cookie.getValue().isBlank());
        return cookie;
    }

    private record Credentials(String email, String username, String password) {
    }

    private record CsrfContext(String token, Cookie cookie) {
    }
}
