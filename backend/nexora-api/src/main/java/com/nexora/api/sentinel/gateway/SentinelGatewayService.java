package com.nexora.api.sentinel.gateway;

import com.nexora.api.auth.AuthenticationFailedException;
import org.springframework.stereotype.Service;

@Service
public class SentinelGatewayService {

    private final SentinelGatewayProvider provider;

    public SentinelGatewayService(SentinelGatewayProvider provider) {
        this.provider = provider;
    }

    public SentinelInsightResponse requestInsight(
            long userId,
            SentinelInsightRequest request) {
        if (userId <= 0) {
            throw new AuthenticationFailedException("Authentication is required");
        }

        SentinelInsightContext context = SentinelInsightContext.fromRequest(request.context());
        SentinelGatewayInput input = new SentinelGatewayInput(
                userId,
                request.message(),
                context);
        return provider.createInsight(input);
    }
}
