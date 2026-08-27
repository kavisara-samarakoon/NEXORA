package com.nexora.api;

import com.nexora.api.observability.RequestCorrelationFilter;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.concurrent.atomic.AtomicBoolean;

import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class RequestCorrelationObservabilityTests {

    private static final String SAFE_REQUEST_ID = "reviewer-2026.08:smoke_test";
    private static final String UUID_PATTERN =
            "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void successResponseReceivesGeneratedRequestId() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(header().exists(RequestCorrelationFilter.HEADER_NAME))
                .andReturn();

        assertGeneratedRequestId(
                result.getResponse().getHeader(RequestCorrelationFilter.HEADER_NAME));
    }

    @Test
    void safeIncomingRequestIdIsEchoed() throws Exception {
        mockMvc.perform(get("/api/health")
                        .header(RequestCorrelationFilter.HEADER_NAME, SAFE_REQUEST_ID))
                .andExpect(status().isOk())
                .andExpect(header().string(RequestCorrelationFilter.HEADER_NAME, SAFE_REQUEST_ID));
    }

    @Test
    void unsafeIncomingRequestIdIsReplaced() throws Exception {
        String unsafeRequestId = "bad request id";

        MvcResult result = mockMvc.perform(get("/api/health")
                        .header(RequestCorrelationFilter.HEADER_NAME, unsafeRequestId))
                .andExpect(status().isOk())
                .andExpect(header().exists(RequestCorrelationFilter.HEADER_NAME))
                .andReturn();

        String responseRequestId = result.getResponse().getHeader(RequestCorrelationFilter.HEADER_NAME);
        assertFalse(unsafeRequestId.equals(responseRequestId));
        assertGeneratedRequestId(responseRequestId);
    }

    @Test
    void authenticationErrorReceivesRequestIdWithoutChangingJsonContract() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().exists(RequestCorrelationFilter.HEADER_NAME))
                .andExpect(jsonPath("$.error").value("authentication_required"))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.path").value("/api/auth/me"))
                .andExpect(jsonPath("$.timestampUtc").isNotEmpty())
                .andExpect(jsonPath("$.retryAfterSeconds").value(nullValue()))
                .andExpect(jsonPath("$.requestId").doesNotExist())
                .andReturn();

        assertFalse(result.getResponse().getContentAsString().contains("\"requestId\""));
        assertFalse(result.getResponse().getContentAsString().contains("\"request_id\""));
    }

    @Test
    void browserGuardErrorAlsoReceivesRequestId() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .header(RequestCorrelationFilter.HEADER_NAME, SAFE_REQUEST_ID)
                        .header(HttpHeaders.ORIGIN, "https://untrusted.example")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden())
                .andExpect(header().string(RequestCorrelationFilter.HEADER_NAME, SAFE_REQUEST_ID))
                .andExpect(jsonPath("$.error").value("csrf_failed"))
                .andExpect(jsonPath("$.requestId").doesNotExist());
    }

    @Test
    void mdcIsAvailableDuringFilterChainAndClearedAfterRequest() throws Exception {
        RequestCorrelationFilter filter = new RequestCorrelationFilter();
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/health");
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicBoolean chainCalled = new AtomicBoolean();
        request.addHeader(RequestCorrelationFilter.HEADER_NAME, SAFE_REQUEST_ID);

        assertNull(MDC.get(RequestCorrelationFilter.MDC_KEY));
        filter.doFilter(request, response, (servletRequest, servletResponse) -> {
            chainCalled.set(true);
            assertEquals(SAFE_REQUEST_ID, MDC.get(RequestCorrelationFilter.MDC_KEY));
            assertEquals(
                    SAFE_REQUEST_ID,
                    servletRequest.getAttribute(RequestCorrelationFilter.REQUEST_ATTRIBUTE_KEY));
            assertEquals(
                    SAFE_REQUEST_ID,
                    ((MockHttpServletResponse) servletResponse)
                            .getHeader(RequestCorrelationFilter.HEADER_NAME));
        });

        assertTrue(chainCalled.get());
        assertEquals(
                SAFE_REQUEST_ID,
                request.getAttribute(RequestCorrelationFilter.REQUEST_ATTRIBUTE_KEY));
        assertEquals(SAFE_REQUEST_ID, response.getHeader(RequestCorrelationFilter.HEADER_NAME));
        assertNull(MDC.get(RequestCorrelationFilter.MDC_KEY));
    }

    private static void assertGeneratedRequestId(String requestId) {
        assertTrue(requestId != null && requestId.matches(UUID_PATTERN));
    }
}
