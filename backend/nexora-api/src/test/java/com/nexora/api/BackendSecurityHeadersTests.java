package com.nexora.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class BackendSecurityHeadersTests {
    private static final String X_CONTENT_TYPE_OPTIONS = "X-Content-Type-Options";
    private static final String X_FRAME_OPTIONS = "X-Frame-Options";
    private static final String REFERRER_POLICY = "Referrer-Policy";
    private static final String PERMISSIONS_POLICY = "Permissions-Policy";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void publicApiResponsesIncludeBrowserSecurityHeaders() throws Exception {
        expectBrowserSecurityHeaders(mockMvc.perform(get("/api/health")))
                .andExpect(status().isOk());
    }

    @Test
    void authSensitiveResponsesIncludeSecurityAndNoCacheHeaders() throws Exception {
        expectBrowserSecurityHeaders(mockMvc.perform(get("/api/auth/csrf")))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, containsString("no-cache")))
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, containsString("no-store")))
                .andExpect(header().string(HttpHeaders.PRAGMA, "no-cache"))
                .andExpect(header().string(HttpHeaders.EXPIRES, "0"));
    }

    private static ResultActions expectBrowserSecurityHeaders(ResultActions result) throws Exception {
        return result
                .andExpect(header().string(X_CONTENT_TYPE_OPTIONS, "nosniff"))
                .andExpect(header().string(X_FRAME_OPTIONS, "DENY"))
                .andExpect(header().string(REFERRER_POLICY, "no-referrer"))
                .andExpect(header().string(PERMISSIONS_POLICY, containsString("camera=()")))
                .andExpect(header().string(PERMISSIONS_POLICY, containsString("microphone=()")))
                .andExpect(header().string(PERMISSIONS_POLICY, containsString("geolocation=()")));
    }
}
