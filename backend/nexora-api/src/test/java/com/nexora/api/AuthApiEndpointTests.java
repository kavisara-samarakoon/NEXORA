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

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AuthApiEndpointTests {

    private static final String TRUSTED_ORIGIN = "http://localhost:3000";
    private static final String CSRF_HEADER = "X-NEXORA-CSRF";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void csrfEndpointReturnsTokenAndSetsReadableCookieWithoutCreatingARefreshSession() throws Exception {
        CsrfContext first = csrfContext();
        CsrfContext second = csrfContext();

        assertFalse(first.token().isBlank());
        assertNotEquals(first.token(), second.token());
        assertTrue(first.setCookie().startsWith("nexora_csrf_token="));
        assertTrue(first.setCookie().contains("Path=/api/auth"));
        assertTrue(first.setCookie().contains("Max-Age=7200"));
        assertTrue(first.setCookie().contains("SameSite=Lax"));
        assertFalse(first.setCookie().contains("HttpOnly"));
        assertFalse(first.setCookie().contains("Secure"));
        assertTrue(first.setCookie().contains(first.token()));
        assertFalse(first.setCookie().contains("nexora_refresh_token"));
    }

    @Test
    void csrfEndpointDoesNotRotateAnExistingRefreshSession() throws Exception {
        Cookie refreshCookie = refreshCookie(register(uniqueUser()));
        CsrfContext csrf = csrfContext(refreshCookie);

        mockMvc.perform(authPost("/api/auth/refresh", csrf).cookie(refreshCookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tokenType").value("Bearer"));
    }

    @Test
    void registerReturnsTokenAndSafeUser() throws Exception {
        Credentials user = uniqueUser();

        CsrfContext csrf = csrfContext();
        MvcResult result = mockMvc.perform(authPost("/api/auth/register", csrf)
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
        CsrfContext csrf = csrfContext();

        mockMvc.perform(authPost("/api/auth/register", csrf)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson(new Credentials(user.email(), user.username() + "x", user.password()))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("account_conflict"));

        mockMvc.perform(authPost("/api/auth/register", csrf)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson(new Credentials("other-" + user.email(), user.username(), user.password()))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error").value("account_conflict"));
    }

    @Test
    void loginWorksWithEmailOrUsername() throws Exception {
        Credentials user = uniqueUser();
        register(user);
        CsrfContext csrf = csrfContext();

        MvcResult emailLogin = mockMvc.perform(authPost("/api/auth/login", csrf)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginJson(user.email().toUpperCase(), user.password())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.user.email").value(user.email()))
                .andReturn();
        assertIssuedRefreshCookie(emailLogin);

        MvcResult usernameLogin = mockMvc.perform(authPost("/api/auth/login", csrf)
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
        CsrfContext csrf = csrfContext();

        mockMvc.perform(authPost("/api/auth/login", csrf)
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
        CsrfContext csrf = csrfContext();
        String originalAccessToken = objectMapper.readTree(registered.getResponse().getContentAsString())
                .path("token")
                .stringValue();

        MvcResult refreshed = mockMvc.perform(authPost("/api/auth/refresh", csrf)
                        .cookie(originalCookie))
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
        CsrfContext csrf = csrfContext();

        mockMvc.perform(authPost("/api/auth/refresh", csrf).cookie(originalCookie))
                .andExpect(status().isOk());

        mockMvc.perform(authPost("/api/auth/refresh", csrf).cookie(originalCookie))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("authentication_failed"));
    }

    @Test
    void refreshRequiresCookie() throws Exception {
        mockMvc.perform(authPost("/api/auth/refresh", csrfContext()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("authentication_failed"));
    }

    @Test
    void logoutRevokesSessionClearsCookieAndIsIdempotent() throws Exception {
        Cookie refreshCookie = refreshCookie(register(uniqueUser()));
        CsrfContext csrf = csrfContext();

        MvcResult logout = mockMvc.perform(authPost("/api/auth/logout", csrf)
                        .cookie(refreshCookie))
                .andExpect(status().isNoContent())
                .andReturn();
        assertClearedRefreshCookie(logout);

        mockMvc.perform(authPost("/api/auth/refresh", csrf).cookie(refreshCookie))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("authentication_failed"));

        MvcResult repeatedLogout = mockMvc.perform(authPost("/api/auth/logout", csrf))
                .andExpect(status().isNoContent())
                .andReturn();
        assertClearedRefreshCookie(repeatedLogout);
    }

    @Test
    void authPostRoutesRejectMissingCsrfHeader() throws Exception {
        Credentials user = uniqueUser();
        Cookie refresh = refreshCookie(register(user));
        CsrfContext csrf = csrfContext();

        expectTrustedCsrfFailure(postWithoutCsrfHeader("/api/auth/register", csrf)
                .contentType(MediaType.APPLICATION_JSON)
                .content(registerJson(uniqueUser())));
        expectTrustedCsrfFailure(postWithoutCsrfHeader("/api/auth/login", csrf)
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson(user.email(), user.password())));
        expectTrustedCsrfFailure(postWithoutCsrfHeader("/api/auth/refresh", csrf).cookie(refresh));
        expectTrustedCsrfFailure(postWithoutCsrfHeader("/api/auth/logout", csrf).cookie(refresh));
    }

    @Test
    void authPostRoutesRejectMismatchedCsrfHeaderAndCookie() throws Exception {
        Credentials user = uniqueUser();
        Cookie refresh = refreshCookie(register(user));
        CsrfContext csrf = csrfContext();

        expectTrustedCsrfFailure(postWithMismatchedCsrf("/api/auth/register", csrf)
                .contentType(MediaType.APPLICATION_JSON)
                .content(registerJson(uniqueUser())));
        expectTrustedCsrfFailure(postWithMismatchedCsrf("/api/auth/login", csrf)
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson(user.email(), user.password())));
        expectTrustedCsrfFailure(postWithMismatchedCsrf("/api/auth/refresh", csrf).cookie(refresh));
        expectTrustedCsrfFailure(postWithMismatchedCsrf("/api/auth/logout", csrf).cookie(refresh));
    }

    @Test
    void authPostRoutesRejectUntrustedOrigin() throws Exception {
        Credentials user = uniqueUser();
        Cookie refresh = refreshCookie(register(user));
        CsrfContext csrf = csrfContext();

        expectCsrfFailure(authPostFromOrigin("/api/auth/register", csrf, "https://attacker.example")
                .contentType(MediaType.APPLICATION_JSON)
                .content(registerJson(uniqueUser())));
        expectCsrfFailure(authPostFromOrigin("/api/auth/login", csrf, "https://attacker.example")
                .contentType(MediaType.APPLICATION_JSON)
                .content(loginJson(user.email(), user.password())));
        expectCsrfFailure(authPostFromOrigin("/api/auth/refresh", csrf, "https://attacker.example")
                .cookie(refresh));
        expectCsrfFailure(authPostFromOrigin("/api/auth/logout", csrf, "https://attacker.example")
                .cookie(refresh));
    }

    @Test
    void trustedRefererAndNoOriginRequestsWorkWithValidCsrf() throws Exception {
        Credentials refererUser = uniqueUser();
        CsrfContext csrf = csrfContext();

        mockMvc.perform(post("/api/auth/register")
                        .header(HttpHeaders.REFERER, TRUSTED_ORIGIN + "/register")
                        .header(CSRF_HEADER, csrf.token())
                        .cookie(csrf.cookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson(refererUser)))
                .andExpect(status().isCreated());

        Credentials noOriginUser = uniqueUser();
        mockMvc.perform(post("/api/auth/register")
                        .header(CSRF_HEADER, csrf.token())
                        .cookie(csrf.cookie())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson(noOriginUser)))
                .andExpect(status().isCreated());
    }

    @Test
    void healthRemainsPublicWithoutAuthentication() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.service").value("NEXORA API"));
    }

    private MvcResult register(Credentials user) throws Exception {
        return mockMvc.perform(authPost("/api/auth/register", csrfContext())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(registerJson(user)))
                .andExpect(status().isCreated())
                .andReturn();
    }

    private CsrfContext csrfContext(Cookie... existingCookies) throws Exception {
        MockHttpServletRequestBuilder request = get("/api/auth/csrf")
                .header(HttpHeaders.ORIGIN, TRUSTED_ORIGIN);
        if (existingCookies.length > 0) {
            request.cookie(existingCookies);
        }
        MvcResult result = mockMvc.perform(request)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.csrfToken").isNotEmpty())
                .andReturn();
        String token = objectMapper.readTree(result.getResponse().getContentAsString())
                .path("csrfToken")
                .stringValue();
        String setCookie = result.getResponse().getHeader(HttpHeaders.SET_COOKIE);
        assertNotNull(setCookie);
        return new CsrfContext(token, cookieFromSetCookie(setCookie), setCookie);
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

    private static MockHttpServletRequestBuilder postWithoutCsrfHeader(String path, CsrfContext csrf) {
        return post(path)
                .header(HttpHeaders.ORIGIN, TRUSTED_ORIGIN)
                .cookie(csrf.cookie());
    }

    private static MockHttpServletRequestBuilder postWithMismatchedCsrf(String path, CsrfContext csrf) {
        return post(path)
                .header(HttpHeaders.ORIGIN, TRUSTED_ORIGIN)
                .header(CSRF_HEADER, "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")
                .cookie(csrf.cookie());
    }

    private void expectCsrfFailure(MockHttpServletRequestBuilder request) throws Exception {
        mockMvc.perform(request)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("csrf_failed"))
                .andExpect(jsonPath("$.message")
                        .value("The authentication request could not be verified"));
    }

    private void expectTrustedCsrfFailure(MockHttpServletRequestBuilder request) throws Exception {
        mockMvc.perform(request)
                .andExpect(status().isForbidden())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, TRUSTED_ORIGIN))
                .andExpect(jsonPath("$.error").value("csrf_failed"))
                .andExpect(jsonPath("$.message")
                        .value("The authentication request could not be verified"));
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
        return cookieFromSetCookie(setCookie);
    }

    private static Cookie cookieFromSetCookie(String setCookie) {
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

    private record CsrfContext(String token, Cookie cookie, String setCookie) {
    }
}
