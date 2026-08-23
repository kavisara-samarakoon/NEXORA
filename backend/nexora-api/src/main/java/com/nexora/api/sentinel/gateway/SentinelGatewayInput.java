package com.nexora.api.sentinel.gateway;

import java.util.Objects;

public record SentinelGatewayInput(
        long userId,
        String message,
        SentinelInsightContext context,
        SentinelContextSummary summary) {

    public SentinelGatewayInput {
        message = Objects.requireNonNull(message, "message").trim();
        context = Objects.requireNonNull(context, "context");
        summary = summary == null ? SentinelContextSummary.empty(context) : summary;
    }

    public SentinelGatewayInput(
            long userId,
            String message,
            SentinelInsightContext context) {
        this(userId, message, context, SentinelContextSummary.empty(context));
    }
}
