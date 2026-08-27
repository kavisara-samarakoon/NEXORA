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
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.ObjectMapper;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = "nexora.auth.abuse-controls.enabled=false")
@AutoConfigureMockMvc
class AuthCookieSecurityTests {
    private static final String TRUSTED_ORIGIN = "http://localhost:3000";
    private static final String CSRF_HEADER = "X-NEXORA-CSRF";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void csrfCookieIsReadableScopedAndNotARefreshSession() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/auth/csrf"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.csrfToken").isNotEmpty())
                .andReturn();

        String setCookie = setCookie(result);
        String responseToken = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("csrfToken")
                .stringValue();
        Cookie csrfCookie = cookieFromSetCookie(setCookie);

        assertTrue(setCookie.startsWith("nexora_csrf_token="));
        assertTrue(setCookie.contains("Path=/api/auth"));
        assertTrue(setCookie.contains("Max-Age=7200"));
        assertTrue(setCookie.contains("SameSite=Lax"));
        assertFalse(setCookie.contains("HttpOnly"));
        assertFalse(setCookie.contains("Secure"));
        assertFalse(setCookie.contains("nexora_refresh_token"));
        assertEquals(responseToken, csrfCookie.getValue());
    }

    @Test
    void loginIssuesHttpOnlyRefreshCookieWithNarrowScope() throws Exception {
        Credentials user = uniqueUser();
        register(user);
        CsrfContext csrf = csrfContext();

        MvcResult login = mockMvc.perform(authPost("/api/auth/login", csrf)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(user)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.user.email").value(user.email()))
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andReturn();

        Cookie refreshCookie = assertIssuedRefreshCookie(login);
        assertFalse(login.getResponse().getContentAsString().contains(refreshCookie.getValue()));
    }

    @Test
    void refreshRotatesTheHttpOnlyRefreshCookie() throws Exception {
        MvcResult registered = register(uniqueUser());
        Cookie originalRefreshCookie = cookieFromSetCookie(setCookie(registered));
        CsrfContext csrf = csrfContext();

        MvcResult refreshed = mockMvc.perform(authPost("/api/auth/refresh", csrf)
                        .cookie(originalRefreshCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andReturn();

        Cookie rotatedRefreshCookie = assertIssuedRefreshCookie(refreshed);
        assertNotEquals(originalRefreshCookie.getValue(), rotatedRefreshCookie.getValue());
        assertFalse(refreshed.getResponse().getContentAsString()
                .contains(rotatedRefreshCookie.getValue()));
    }

    @Test
    void logoutClearsRefreshCookieWithTheSameSecurityAttributes() throws Exception {
        Cookie refreshCookie = cookieFromSetCookie(setCookie(register(uniqueUser())));
        CsrfContext csrf = csrfContext();

        MvcResult logout = mockMvc.perform(authPost("/api/auth/logout", csrf)
                        .cookie(refreshCookie))
                .andExpect(status().isNoContent())
                .andReturn();

        String setCookie = setCookie(logout);
        assertTrue(setCookie.startsWith("nexora_refresh_token="));
        assertTrue(setCookie.contains("Path=/api/auth"));
        assertTrue(setCookie.contains("Max-Age=0"));
        assertTrue(setCookie.contains("HttpOnly"));
        assertTrue(setCookie.contains("SameSite=Lax"));
        assertFalse(setCookie.contains("Secure"));
        assertTrue(cookieFromSetCookie(setCookie).getValue().isEmpty());
        assertTrue(logout.getResponse().getContentAsString().isEmpty());
    }

    private MvcResult register(Credentials user) throws Exception {
        return mockMvc.perform(authPost("/api/auth/register", csrfContext())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson(user)))
                .andExpect(status().isCreated())
                .andReturn();
    }

    private CsrfContext csrfContext() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/auth/csrf"))
                .andExpect(status().isOk())
                .andReturn();
        String token = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("csrfToken")
                .stringValue();
        return new CsrfContext(token, cookieFromSetCookie(setCookie(result)));
    }

    private static MockHttpServletRequestBuilder authPost(String path, CsrfContext csrf) {
        return post(path)
                .header(HttpHeaders.ORIGIN, TRUSTED_ORIGIN)
                .header(CSRF_HEADER, csrf.token())
                .cookie(csrf.cookie());
    }

    private static Cookie assertIssuedRefreshCookie(MvcResult result) {
        String setCookie = setCookie(result);
        assertTrue(setCookie.startsWith("nexora_refresh_token="));
        assertTrue(setCookie.contains("Path=/api/auth"));
        assertTrue(setCookie.contains("Max-Age=604800"));
        assertTrue(setCookie.contains("HttpOnly"));
        assertTrue(setCookie.contains("SameSite=Lax"));
        assertFalse(setCookie.contains("Secure"));
        Cookie cookie = cookieFromSetCookie(setCookie);
        assertFalse(cookie.getValue().isBlank());
        return cookie;
    }

    private static String setCookie(MvcResult result) {
        String setCookie = result.getResponse().getHeader(HttpHeaders.SET_COOKIE);
        assertNotNull(setCookie);
        return setCookie;
    }

    private static Cookie cookieFromSetCookie(String setCookie) {
        String[] nameAndValue = setCookie.split(";", 2)[0].split("=", 2);
        return new Cookie(nameAndValue[0], nameAndValue.length == 2 ? nameAndValue[1] : "");
    }

    private static Credentials uniqueUser() {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        return new Credentials(
                "cookie-" + suffix + "@example.com",
                "cookie_" + suffix,
                "strong-password-123");
    }

    private static String registerJson(Credentials user) {
        return """
                {
                  "email": "%s",
                  "username": "%s",
                  "displayName": "Cookie Security Tester",
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
                """.formatted(user.email(), user.password());
    }

    private record Credentials(String email, String username, String password) {
    }

    private record CsrfContext(String token, Cookie cookie) {
    }
}
