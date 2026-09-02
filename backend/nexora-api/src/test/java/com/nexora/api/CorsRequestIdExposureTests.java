package com.nexora.api;

import com.nexora.api.observability.RequestCorrelationFilter;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class CorsRequestIdExposureTests {

    private static final String TRUSTED_ORIGIN = "http://localhost:3000";
    private static final String CSRF_HEADER = "X-NEXORA-CSRF";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void corsResponseExposesOnlyTheRequestIdHeader() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/health")
                        .header(HttpHeaders.ORIGIN, TRUSTED_ORIGIN))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, TRUSTED_ORIGIN))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true"))
                .andExpect(header().string(
                        HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS,
                        RequestCorrelationFilter.HEADER_NAME))
                .andExpect(header().exists(RequestCorrelationFilter.HEADER_NAME))
                .andReturn();

        String exposedHeaders = result.getResponse()
                .getHeader(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS);
        assertNotNull(exposedHeaders);

        Set<String> normalizedExposedHeaders = Arrays.stream(exposedHeaders.split(","))
                .map(String::trim)
                .map(value -> value.toLowerCase(Locale.ROOT))
                .collect(Collectors.toSet());

        assertEquals(Set.of(RequestCorrelationFilter.HEADER_NAME.toLowerCase(Locale.ROOT)),
                normalizedExposedHeaders);
        assertFalse(normalizedExposedHeaders.contains(HttpHeaders.AUTHORIZATION.toLowerCase(Locale.ROOT)));
        assertFalse(normalizedExposedHeaders.contains(HttpHeaders.COOKIE.toLowerCase(Locale.ROOT)));
        assertFalse(normalizedExposedHeaders.contains(HttpHeaders.SET_COOKIE.toLowerCase(Locale.ROOT)));
        assertFalse(normalizedExposedHeaders.contains(CSRF_HEADER.toLowerCase(Locale.ROOT)));
    }

    @Test
    void existingCorsPreflightPolicyRemainsAvailableForTrustedFrontend() throws Exception {
        mockMvc.perform(options("/api/health")
                        .header(HttpHeaders.ORIGIN, TRUSTED_ORIGIN)
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "PATCH")
                        .header(
                                HttpHeaders.ACCESS_CONTROL_REQUEST_HEADERS,
                                String.join(", ",
                                        HttpHeaders.CONTENT_TYPE,
                                        HttpHeaders.AUTHORIZATION,
                                        CSRF_HEADER)))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, TRUSTED_ORIGIN))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true"))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_METHODS, containsString("PATCH")))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS, containsString(HttpHeaders.CONTENT_TYPE)))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS, containsString(HttpHeaders.AUTHORIZATION)))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_HEADERS, containsString(CSRF_HEADER)));
    }

    @Test
    void untrustedOriginRemainsRejected() throws Exception {
        mockMvc.perform(get("/api/health")
                        .header(HttpHeaders.ORIGIN, "https://untrusted.example"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN));
    }
}
