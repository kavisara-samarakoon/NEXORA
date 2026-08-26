package com.nexora.api.error;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class ApiErrorFactoryTests {

    @Test
    void createsUtcMetadataFromRequestPathWithoutQueryString() {
        Instant timestamp = Instant.parse("2026-08-26T12:34:56Z");
        ApiErrorFactory factory = new ApiErrorFactory(Clock.fixed(timestamp, ZoneOffset.UTC));
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/auth/register");
        request.setQueryString("debug=sensitive-query-value");

        ApiErrorResponse response = factory.create(
                HttpStatus.BAD_REQUEST,
                "validation_failed",
                "Request validation failed",
                request);

        assertEquals("validation_failed", response.error());
        assertEquals("Request validation failed", response.message());
        assertEquals(400, response.status());
        assertEquals("/api/auth/register", response.path());
        assertEquals(timestamp, response.timestampUtc());
        assertNull(response.retryAfterSeconds());
    }

    @Test
    void preservesRetryDelayOnlyWhenSupplied() {
        ApiErrorFactory factory = new ApiErrorFactory(Clock.systemUTC());
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/auth/login");

        ApiErrorResponse response = factory.create(
                HttpStatus.TOO_MANY_REQUESTS,
                "rate_limited",
                "Too many authentication attempts. Please wait before trying again.",
                request,
                60L);

        assertEquals(429, response.status());
        assertEquals(60L, response.retryAfterSeconds());
    }
}
