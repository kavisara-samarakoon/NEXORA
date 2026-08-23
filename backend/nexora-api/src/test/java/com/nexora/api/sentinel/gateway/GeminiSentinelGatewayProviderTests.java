package com.nexora.api.sentinel.gateway;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GeminiSentinelGatewayProviderTests {

    @Test
    void wrapsOnlyGeminiAnswerInDeterministicBackendFields() {
        GeminiSentinelClient client = mock(GeminiSentinelClient.class);
        SentinelGatewayInput input = new SentinelGatewayInput(
                7L,
                "Should I buy this game?",
                SentinelInsightContext.DEALS);
        when(client.generateText(input)).thenReturn("Check the current official store price.");

        SentinelInsightResponse response =
                new GeminiSentinelGatewayProvider(client).createInsight(input);

        assertAll(
                () -> assertEquals("gemini-provider-foundation", response.mode()),
                () -> assertEquals("gemini", response.provider()),
                () -> assertEquals("deals", response.context()),
                () -> assertEquals("Sentinel Gemini Preview", response.title()),
                () -> assertEquals("Check the current official store price.", response.answer()),
                () -> assertFalse(response.recommendations().isEmpty()),
                () -> assertFalse(response.safetyNotes().isEmpty()),
                () -> assertFalse(response.nextActions().isEmpty())
        );
    }

    @Test
    void rejectsUnexpectedBlankClientAnswerSoRouterCanFallback() {
        GeminiSentinelClient client = mock(GeminiSentinelClient.class);
        SentinelGatewayInput input = new SentinelGatewayInput(
                7L,
                "Should I buy this game?",
                SentinelInsightContext.DEALS);
        when(client.generateText(input)).thenReturn("  ");

        assertThrows(
                GeminiClientException.class,
                () -> new GeminiSentinelGatewayProvider(client).createInsight(input));
    }
}
