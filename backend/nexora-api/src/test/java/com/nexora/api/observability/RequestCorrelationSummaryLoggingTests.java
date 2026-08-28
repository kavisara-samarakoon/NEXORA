package com.nexora.api.observability;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.Locale;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RequestCorrelationSummaryLoggingTests {

    private static final String SAFE_REQUEST_ID = "reviewer-2026.08:summary_test";
    private static final String UUID_PATTERN =
            "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$";

    @Test
    void requestSummaryLogIncludesSafeMetadataAndMdcRequestId() throws Exception {
        Logger logger = (Logger) LoggerFactory.getLogger(RequestCorrelationFilter.class);
        ListAppender<ILoggingEvent> appender = mdcCapturingAppender();
        logger.addAppender(appender);

        try {
            RequestCorrelationFilter filter = new RequestCorrelationFilter();
            MockHttpServletRequest request =
                    new MockHttpServletRequest("GET", "/api/test/summary");
            MockHttpServletResponse response = new MockHttpServletResponse();
            request.addHeader(RequestCorrelationFilter.HEADER_NAME, SAFE_REQUEST_ID);
            request.setQueryString("debug=sensitive-query-value");

            filter.doFilter(request, response, (servletRequest, servletResponse) -> {
                assertEquals(SAFE_REQUEST_ID, MDC.get(RequestCorrelationFilter.MDC_KEY));
                ((MockHttpServletResponse) servletResponse).setStatus(204);
            });

            assertNull(MDC.get(RequestCorrelationFilter.MDC_KEY));
            assertEquals(
                    SAFE_REQUEST_ID,
                    response.getHeader(RequestCorrelationFilter.HEADER_NAME));

            ILoggingEvent event = onlyEvent(appender);
            assertEquals(Level.INFO, event.getLevel());
            assertSummary(event, "GET", "/api/test/summary", 204);
            assertEquals(
                    SAFE_REQUEST_ID,
                    event.getMDCPropertyMap().get(RequestCorrelationFilter.MDC_KEY));
            assertFalse(event.getFormattedMessage().contains(SAFE_REQUEST_ID));
            assertFalse(event.getFormattedMessage().contains("sensitive-query-value"));
            assertSafeSummaryMessage(event.getFormattedMessage());
        } finally {
            MDC.remove(RequestCorrelationFilter.MDC_KEY);
            logger.detachAppender(appender);
            appender.stop();
        }
    }

    @Test
    void generatedRequestIdIsAvailableToSummaryLog() throws Exception {
        Logger logger = (Logger) LoggerFactory.getLogger(RequestCorrelationFilter.class);
        ListAppender<ILoggingEvent> appender = mdcCapturingAppender();
        logger.addAppender(appender);

        try {
            RequestCorrelationFilter filter = new RequestCorrelationFilter();
            MockHttpServletRequest request =
                    new MockHttpServletRequest("POST", "/api/test/generated");
            MockHttpServletResponse response = new MockHttpServletResponse();

            filter.doFilter(request, response, (servletRequest, servletResponse) ->
                    ((MockHttpServletResponse) servletResponse).setStatus(201));

            String generatedRequestId =
                    response.getHeader(RequestCorrelationFilter.HEADER_NAME);
            assertNotNull(generatedRequestId);
            assertTrue(generatedRequestId.matches(UUID_PATTERN));
            assertNull(MDC.get(RequestCorrelationFilter.MDC_KEY));

            ILoggingEvent event = onlyEvent(appender);
            assertSummary(event, "POST", "/api/test/generated", 201);
            assertEquals(
                    generatedRequestId,
                    event.getMDCPropertyMap().get(RequestCorrelationFilter.MDC_KEY));
            assertFalse(event.getFormattedMessage().contains(generatedRequestId));
            assertSafeSummaryMessage(event.getFormattedMessage());
        } finally {
            MDC.remove(RequestCorrelationFilter.MDC_KEY);
            logger.detachAppender(appender);
            appender.stop();
        }
    }

    @Test
    void summaryLogStillRunsWhenChainThrows() {
        Logger logger = (Logger) LoggerFactory.getLogger(RequestCorrelationFilter.class);
        ListAppender<ILoggingEvent> appender = mdcCapturingAppender();
        logger.addAppender(appender);

        try {
            RequestCorrelationFilter filter = new RequestCorrelationFilter();
            MockHttpServletRequest request =
                    new MockHttpServletRequest("GET", "/api/test/failure");
            MockHttpServletResponse response = new MockHttpServletResponse();
            request.addHeader(RequestCorrelationFilter.HEADER_NAME, SAFE_REQUEST_ID);

            assertThrows(ServletException.class, () ->
                    filter.doFilter(request, response, (servletRequest, servletResponse) -> {
                        throw new ServletException("simulated failure");
                    }));

            assertNull(MDC.get(RequestCorrelationFilter.MDC_KEY));
            ILoggingEvent event = onlyEvent(appender);
            assertSummary(event, "GET", "/api/test/failure", 200);
            assertEquals(
                    SAFE_REQUEST_ID,
                    event.getMDCPropertyMap().get(RequestCorrelationFilter.MDC_KEY));
            assertNull(event.getThrowableProxy());
            assertFalse(event.getFormattedMessage().contains("simulated failure"));
            assertSafeSummaryMessage(event.getFormattedMessage());
        } finally {
            MDC.remove(RequestCorrelationFilter.MDC_KEY);
            logger.detachAppender(appender);
            appender.stop();
        }
    }

    private static ListAppender<ILoggingEvent> mdcCapturingAppender() {
        ListAppender<ILoggingEvent> appender = new ListAppender<>() {
            @Override
            protected void append(ILoggingEvent event) {
                event.prepareForDeferredProcessing();
                super.append(event);
            }
        };
        appender.start();
        return appender;
    }

    private static ILoggingEvent onlyEvent(ListAppender<ILoggingEvent> appender) {
        assertEquals(1, appender.list.size());
        return appender.list.get(0);
    }

    private static void assertSummary(
            ILoggingEvent event,
            String method,
            String path,
            int status) {
        String message = event.getFormattedMessage();
        assertTrue(message.contains("API request completed"));
        assertTrue(message.contains("method=" + method));
        assertTrue(message.contains("path=" + path));
        assertTrue(message.contains("status=" + status));
        assertTrue(message.matches(".*durationMs=[0-9]+$"));
    }

    private static void assertSafeSummaryMessage(String message) {
        String normalizedMessage = message.toLowerCase(Locale.ROOT);
        assertFalse(message.contains("Authorization"));
        assertFalse(message.contains("Bearer"));
        assertFalse(message.contains("Cookie"));
        assertFalse(normalizedMessage.contains("csrf"));
        assertFalse(normalizedMessage.contains("password"));
        assertFalse(normalizedMessage.contains("token"));
        assertFalse(normalizedMessage.contains("request body"));
        assertFalse(normalizedMessage.contains("response body"));
    }
}
