package com.nexora.api.sentinel.gateway;

import com.nexora.api.auth.AuthenticationFailedException;
import org.springframework.stereotype.Service;

@Service
public class SentinelGatewayService {

    private final SentinelGatewayProvider provider;
    private final SentinelContextSummaryService contextSummaryService;
    private final SentinelRateLimiter rateLimiter;

    public SentinelGatewayService(
            SentinelGatewayProvider provider,
            SentinelContextSummaryService contextSummaryService,
            SentinelRateLimiter rateLimiter) {
        this.provider = provider;
        this.contextSummaryService = contextSummaryService;
        this.rateLimiter = rateLimiter;
    }

    public SentinelInsightResponse requestInsight(
            long userId,
            SentinelInsightRequest request) {
        if (userId <= 0) {
            throw new AuthenticationFailedException("Authentication is required");
        }

        SentinelRateLimitResult rateLimit = rateLimiter.check(userId);
        if (!rateLimit.allowed()) {
            throw new SentinelRateLimitExceededException(rateLimit.retryAfterSeconds());
        }

        SentinelInsightContext context = SentinelInsightContext.fromRequest(request.context());
        SentinelContextSummary summary = contextSummaryService.summarize(userId, context);
        SentinelGatewayInput input = new SentinelGatewayInput(
                userId,
                request.message(),
                context,
                summary);
        return provider.createInsight(input);
    }
}
