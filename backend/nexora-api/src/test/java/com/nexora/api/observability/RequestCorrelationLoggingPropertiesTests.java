package com.nexora.api.observability;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RequestCorrelationLoggingPropertiesTests {

    @Test
    void consolePatternIncludesRequestCorrelationMdcWithSafeFallback() throws IOException {
        Properties properties = new Properties();
        try (InputStream input = getClass().getResourceAsStream("/application.properties")) {
            assertNotNull(input);
            properties.load(input);
        }

        String consolePattern = properties.getProperty("logging.pattern.console");
        assertNotNull(consolePattern);
        assertTrue(consolePattern.contains("%X{nexora.request_id"));
        assertTrue(consolePattern.contains("no-request-id"));
        assertFalse(consolePattern.contains("Authorization"));
        assertFalse(consolePattern.contains("Cookie"));
        assertFalse(consolePattern.contains("queryString"));
    }
}
