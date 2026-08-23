package com.nexora.api.sentinel.gateway;

import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

@Component
@Primary
public class SentinelGatewayProviderRouter implements SentinelGatewayProvider {

    private final SentinelAiProperties properties;
    private final LocalSentinelGatewayProvider localProvider;
    private final GeminiSentinelGatewayProvider geminiProvider;

    public SentinelGatewayProviderRouter(
            SentinelAiProperties properties,
            LocalSentinelGatewayProvider localProvider,
            GeminiSentinelGatewayProvider geminiProvider) {
        this.properties = properties;
        this.localProvider = localProvider;
        this.geminiProvider = geminiProvider;
    }

    @Override
    public SentinelInsightResponse createInsight(SentinelGatewayInput input) {
        if (!properties.isGeminiRequested()) {
            return localProvider.createInsight(input);
        }
        if (!properties.isGeminiConfigured()) {
            return localProvider.createFallback(input);
        }

        try {
            return geminiProvider.createInsight(input);
        } catch (RuntimeException exception) {
            return localProvider.createFallback(input);
        }
    }
}
