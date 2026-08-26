package com.nexora.api.error;

import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class GlobalApiExceptionHandlerTests {

    @Test
    void unexpectedFailureReturnsGenericContractWithoutExceptionDetails() {
        String internalDetail = "sensitive-internal-failure-detail";
        GlobalApiExceptionHandler handler = new GlobalApiExceptionHandler(new ApiErrorFactory());
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/sentinel/status");

        ResponseEntity<ApiErrorResponse> result = handler.unexpected(
                new IllegalStateException(internalDetail),
                request);
        ApiErrorResponse response = result.getBody();

        assertEquals(500, result.getStatusCode().value());
        assertEquals("internal_error", response.error());
        assertEquals("An unexpected API error occurred", response.message());
        assertEquals(500, response.status());
        assertEquals("/api/sentinel/status", response.path());
        assertFalse(response.toString().contains(internalDetail));
        assertFalse(response.toString().contains("IllegalStateException"));
    }
}
