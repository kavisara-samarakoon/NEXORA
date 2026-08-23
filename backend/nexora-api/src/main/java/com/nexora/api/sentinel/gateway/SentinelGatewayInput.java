package com.nexora.api.sentinel.gateway;

import java.util.Objects;

public record SentinelGatewayInput(
        long userId,
        String message,
        SentinelInsightContext context) {

    public SentinelGatewayInput {
        message = Objects.requireNonNull(message, "message").trim();
        context = Objects.requireNonNull(context, "context");
    }
}
