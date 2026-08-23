package com.nexora.api.sentinel.gateway;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class LocalSentinelGatewayProviderTests {

    @Test
    void returnsSafeLocalGuidanceForEveryContext() {
        LocalSentinelGatewayProvider provider = new LocalSentinelGatewayProvider();

        for (SentinelInsightContext context : SentinelInsightContext.values()) {
            SentinelInsightResponse response = provider.createInsight(
                    new SentinelGatewayInput(7L, "  Local guidance please  ", context));

            assertAll(
                    () -> assertEquals("local-foundation", response.mode()),
                    () -> assertEquals("local", response.provider()),
                    () -> assertEquals(context.apiValue(), response.context()),
                    () -> assertFalse(response.answer().isBlank()),
                    () -> assertFalse(response.recommendations().isEmpty()),
                    () -> assertFalse(response.safetyNotes().isEmpty()),
                    () -> assertFalse(response.nextActions().isEmpty())
            );
        }
    }

    @Test
    void marksFallbackResponsesWithoutExposingProviderErrors() {
        SentinelInsightResponse response = new LocalSentinelGatewayProvider()
                .createFallback(new SentinelGatewayInput(
                        7L,
                        "Question",
                        SentinelInsightContext.GENERAL));

        assertAll(
                () -> assertEquals("local-fallback", response.mode()),
                () -> assertEquals("local", response.provider()),
                () -> assertEquals("Sentinel Local Fallback", response.title()),
                () -> assertEquals(
                        "Gemini was unavailable, so NEXORA used its deterministic local fallback.",
                        response.safetyNotes().get(0))
        );
    }
}
