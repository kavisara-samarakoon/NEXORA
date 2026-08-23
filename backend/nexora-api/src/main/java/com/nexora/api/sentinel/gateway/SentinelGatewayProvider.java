package com.nexora.api.sentinel.gateway;

public interface SentinelGatewayProvider {

    SentinelInsightResponse createInsight(SentinelGatewayInput input);
}
