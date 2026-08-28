package com.nexora.api.error;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.nexora.api.observability.RequestCorrelationFilter;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class GlobalApiExceptionHandlerLoggingTests {

    @Test
    void unexpectedFailureLogsSafeRequestMetadataAndMdcRequestId() {
        Logger logger = (Logger) LoggerFactory.getLogger(GlobalApiExceptionHandler.class);
        ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        MDC.put(RequestCorrelationFilter.MDC_KEY, "test-request-id-1234");

        try {
            GlobalApiExceptionHandler handler =
                    new GlobalApiExceptionHandler(new ApiErrorFactory());
            MockHttpServletRequest request =
                    new MockHttpServletRequest("GET", "/api/test/error");
            request.setQueryString("debug=sensitive-query-value");

            ResponseEntity<ApiErrorResponse> result = handler.unexpected(
                    new IllegalStateException("boom"),
                    request);
            ApiErrorResponse response = result.getBody();

            assertEquals(500, result.getStatusCode().value());
            assertNotNull(response);
            assertEquals("internal_error", response.error());
            assertEquals("An unexpected API error occurred", response.message());
            assertEquals(500, response.status());
            assertEquals("/api/test/error", response.path());
            assertNotNull(response.timestampUtc());
            assertNull(response.retryAfterSeconds());
            assertFalse(Arrays.stream(ApiErrorResponse.class.getRecordComponents())
                    .anyMatch(component -> component.getName().equals("requestId")));

            assertEquals(1, appender.list.size());
            ILoggingEvent event = appender.list.get(0);
            String message = event.getFormattedMessage();
            assertEquals(Level.ERROR, event.getLevel());
            assertTrue(message.contains("method=GET"));
            assertTrue(message.contains("path=/api/test/error"));
            assertTrue(message.contains("status=500"));
            assertFalse(message.contains("sensitive-query-value"));
            assertFalse(message.contains("Authorization"));
            assertFalse(message.contains("Bearer"));
            assertNotNull(event.getThrowableProxy());
            assertEquals(
                    "test-request-id-1234",
                    event.getMDCPropertyMap().get(RequestCorrelationFilter.MDC_KEY));
        } finally {
            MDC.remove(RequestCorrelationFilter.MDC_KEY);
            logger.detachAppender(appender);
            appender.stop();
        }
    }
}
