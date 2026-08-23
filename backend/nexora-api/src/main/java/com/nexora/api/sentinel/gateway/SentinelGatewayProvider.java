package com.nexora.api.sentinel.gateway;

public interface SentinelGatewayProvider {

    SentinelInsightResponse createInsight(SentinelInsightContext context);
}
