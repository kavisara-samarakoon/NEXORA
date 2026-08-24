package com.nexora.api.sentinel.gateway;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

@Component
@Primary
public class SentinelGatewayProviderRouter implements SentinelGatewayProvider {

    private final SentinelAiProperties properties;
    private final LocalSentinelGatewayProvider localProvider;
    private final GeminiSentinelGatewayProvider geminiProvider;
    private final SentinelProviderHealthService healthService;

    public SentinelGatewayProviderRouter(
            SentinelAiProperties properties,
            LocalSentinelGatewayProvider localProvider,
            GeminiSentinelGatewayProvider geminiProvider,
            SentinelProviderHealthService healthService) {
        this.properties = properties;
        this.localProvider = localProvider;
        this.geminiProvider = geminiProvider;
        this.healthService = healthService;
    }

    @Override
    public SentinelInsightResponse createInsight(SentinelGatewayInput input) {
        if (!properties.isGeminiRequested()) {
            return localProvider.createInsight(input);
        }
        if (!properties.isGeminiConfigured()) {
            return fallback(input, SentinelProviderFallbackReason.GEMINI_NOT_CONFIGURED);
        }

        try {
            SentinelInsightResponse response = geminiProvider.createInsight(input);
            healthService.recordGeminiSuccess();
            return response;
        } catch (GeminiClientException exception) {
            return fallback(input, exception.reason());
        } catch (RuntimeException exception) {
            return fallback(input, SentinelProviderFallbackReason.UNKNOWN);
        }
    }

    private SentinelInsightResponse fallback(
            SentinelGatewayInput input,
            SentinelProviderFallbackReason reason) {
        healthService.recordGeminiFallback(reason);
        return localProvider.createFallback(input, reason);
    }
}
