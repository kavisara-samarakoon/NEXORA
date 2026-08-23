package com.nexora.api.sentinel.gateway;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

@Component
public class GeminiSentinelGatewayProvider implements SentinelGatewayProvider {

    private static final List<String> SAFETY_NOTES = List.of(
            "Gemini generated only the answer; NEXORA generated these safety fields locally.",
            "NEXORA does not save this message or response as conversation history.",
            "This is guidance only and cannot perform purchases or account actions.");

    private final GeminiSentinelClient client;

    public GeminiSentinelGatewayProvider(GeminiSentinelClient client) {
        this.client = client;
    }

    @Override
    public SentinelInsightResponse createInsight(SentinelGatewayInput input) {
        String answer = client.generateText(input);
        if (answer == null || answer.isBlank()) {
            throw new GeminiClientException("Gemini provider returned no usable answer");
        }
        Guidance guidance = guidanceFor(input.context());
        return new SentinelInsightResponse(
                "gemini-provider-foundation",
                "gemini",
                input.context().apiValue(),
                "Sentinel Gemini Preview",
                answer,
                guidance.recommendations(),
                SAFETY_NOTES,
                guidance.nextActions(),
                Instant.now());
    }

    private static Guidance guidanceFor(SentinelInsightContext context) {
        return switch (context) {
            case WISHLIST -> new Guidance(
                    List.of(
                            "Review the tracked item's target price and recent NEXORA snapshots.",
                            "Treat NEXORA price history as supporting data, not a price guarantee."),
                    List.of(
                            "Review the item in Wishlist before changing any alert setting.",
                            "Check the official store listing before purchasing."));
            case DEALS -> new Guidance(
                    List.of(
                            "Compare the bounded NEXORA deal summary with the official store page.",
                            "Compare the deal with your budget and available price history."),
                    List.of(
                            "Open the current NEXORA deal source for live details.",
                            "Save the item to Wishlist manually if you want continued tracking."));
            case SECURITY -> new Guidance(
                    List.of(
                            "Use official account-security controls and unique credentials.",
                            "Treat this response as general guidance, not an account-risk assessment."),
                    List.of(
                            "Review active sessions through each provider's official account page.",
                            "Contact the relevant provider if account takeover is suspected."));
            case GENERAL -> new Guidance(
                    List.of(
                            "Confirm time-sensitive details against current NEXORA and official sources.",
                            "Keep purchase and account decisions under your control."),
                    List.of(
                            "Use Wishlist, Deals, or Giveaways-oriented general context for more focused guidance.",
                            "Use the relevant NEXORA page for any manual follow-up."));
        };
    }

    private record Guidance(List<String> recommendations, List<String> nextActions) {
    }
}
