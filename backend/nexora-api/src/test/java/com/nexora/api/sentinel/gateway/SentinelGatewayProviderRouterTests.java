package com.nexora.api.sentinel.gateway;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class SentinelGatewayProviderRouterTests {

    private final LocalSentinelGatewayProvider localProvider =
            new LocalSentinelGatewayProvider();
    private final GeminiSentinelGatewayProvider geminiProvider =
            mock(GeminiSentinelGatewayProvider.class);
    private final SentinelProviderHealthService healthService =
            new SentinelProviderHealthService(java.time.Clock.fixed(
                    java.time.Instant.parse("2026-08-24T00:00:00Z"),
                    java.time.ZoneOffset.UTC));
    private final SentinelGatewayInput input = new SentinelGatewayInput(
            7L,
            "Should I buy this game?",
            SentinelInsightContext.DEALS);

    @Test
    void defaultsToLocalProvider() {
        SentinelAiProperties properties = new SentinelAiProperties();

        SentinelInsightResponse response = router(properties).createInsight(input);

        assertEquals("local-foundation", response.mode());
        assertEquals("local", response.provider());
        assertNull(response.fallbackReason());
        verifyNoInteractions(geminiProvider);
    }

    @Test
    void requestedGeminiWithoutKeyUsesLocalFallback() {
        SentinelAiProperties properties = geminiProperties("");

        SentinelInsightResponse response = router(properties).createInsight(input);

        assertEquals("local-fallback", response.mode());
        assertEquals("local", response.provider());
        assertEquals("gemini_not_configured", response.fallbackReason());
        verifyNoInteractions(geminiProvider);
    }

    @Test
    void configuredGeminiUsesGeminiProvider() {
        SentinelAiProperties properties = geminiProperties("test-only-placeholder");
        SentinelInsightResponse geminiResponse = response(
                "gemini-provider-foundation", "gemini");
        when(geminiProvider.createInsight(input)).thenReturn(geminiResponse);

        SentinelInsightResponse response = router(properties).createInsight(input);

        assertEquals(geminiResponse, response);
        assertEquals(1, healthService.snapshot().totalGeminiSuccessCount());
    }

    @Test
    void geminiFailureUsesLocalFallback() {
        SentinelAiProperties properties = geminiProperties("test-only-placeholder");
        when(geminiProvider.createInsight(input))
                .thenThrow(new GeminiClientException(
                        "safe test failure",
                        SentinelProviderFallbackReason.GEMINI_NON_SUCCESS_RESPONSE));

        SentinelInsightResponse response = router(properties).createInsight(input);

        assertEquals("local-fallback", response.mode());
        assertEquals("local", response.provider());
        assertEquals("gemini_non_success_response", response.fallbackReason());
        assertEquals(
                SentinelProviderFallbackReason.GEMINI_NON_SUCCESS_RESPONSE,
                healthService.snapshot().lastFallbackReason());
    }

    @Test
    void classifiedInvalidAndNetworkFailuresRemainSafeInFallbackResponse() {
        SentinelAiProperties properties = geminiProperties("test-only-placeholder");

        for (SentinelProviderFallbackReason reason : java.util.List.of(
                SentinelProviderFallbackReason.GEMINI_INVALID_RESPONSE,
                SentinelProviderFallbackReason.GEMINI_TIMEOUT_OR_NETWORK)) {
            doThrow(new GeminiClientException("safe test failure", reason))
                    .when(geminiProvider).createInsight(input);

            SentinelInsightResponse response = router(properties).createInsight(input);

            assertEquals("local-fallback", response.mode());
            assertEquals(reason.apiValue(), response.fallbackReason());
        }
    }

    private SentinelGatewayProviderRouter router(SentinelAiProperties properties) {
        return new SentinelGatewayProviderRouter(
                properties,
                localProvider,
                geminiProvider,
                healthService);
    }

    private static SentinelAiProperties geminiProperties(String apiKey) {
        SentinelAiProperties properties = new SentinelAiProperties();
        properties.setProvider("gemini");
        properties.getGemini().setApiKey(apiKey);
        return properties;
    }

    private static SentinelInsightResponse response(String mode, String provider) {
        return new SentinelInsightResponse(
                mode,
                provider,
                "deals",
                "Preview",
                "Guidance",
                java.util.List.of("Recommendation"),
                java.util.List.of("Safety"),
                java.util.List.of("Next"),
                null,
                java.time.Instant.parse("2026-08-23T00:00:00Z"));
    }
}
