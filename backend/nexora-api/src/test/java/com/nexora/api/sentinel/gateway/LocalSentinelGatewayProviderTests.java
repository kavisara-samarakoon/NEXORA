package com.nexora.api.sentinel.gateway;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

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
                        SentinelInsightContext.GENERAL),
                        SentinelProviderFallbackReason.GEMINI_TIMEOUT_OR_NETWORK);

        assertAll(
                () -> assertEquals("local-fallback", response.mode()),
                () -> assertEquals("local", response.provider()),
                () -> assertEquals("Sentinel Local Fallback", response.title()),
                () -> assertEquals(
                        "gemini_timeout_or_network",
                        response.fallbackReason()),
                () -> assertEquals(
                        "Gemini was unavailable, so NEXORA used its deterministic local fallback.",
                        response.safetyNotes().get(0))
        );
    }

    @Test
    void usesOnlyHighLevelContextCountsInDeterministicLocalAnswer() {
        SentinelContextSummary summary = new SentinelContextSummary(
                SentinelInsightContext.DEALS,
                0, 0, 0, 12, 0,
                java.util.List.of(),
                java.util.List.of(),
                java.util.List.of(new SentinelDealContext(
                        "Tracked deal", "Steam", "$10", "$20", 50,
                        "-50%", "Great Deal", "RPG")),
                java.util.List.of());

        SentinelInsightResponse response = new LocalSentinelGatewayProvider().createInsight(
                new SentinelGatewayInput(
                        7L, "Question", SentinelInsightContext.DEALS, summary));

        assertAll(
                () -> assertTrue(response.answer().contains("1 bounded deal summaries")),
                () -> assertTrue(response.answer().contains("12 currently available")),
                () -> assertFalse(response.answer().contains("Tracked deal"))
        );
    }
}
