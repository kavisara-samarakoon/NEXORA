package com.nexora.api.sentinel.gateway;

import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

@Component
public class LocalSentinelGatewayProvider implements SentinelGatewayProvider {

    private static final String MODE = "local-foundation";
    private static final String PROVIDER = "local";
    private static final String TITLE = "Sentinel Gateway Preview";
    private static final List<String> LOCAL_SAFETY_NOTES = List.of(
            "Gemini is disabled; this answer comes from the deterministic local provider.",
            "Your message is not saved by this gateway.",
            "This response is general local guidance, not an automated account action.");
    private static final List<String> FALLBACK_SAFETY_NOTES = List.of(
            "Gemini was unavailable, so NEXORA used its deterministic local fallback.",
            "Your message is not saved by this gateway.",
            "This response is general local guidance, not an automated account action.");

    @Override
    public SentinelInsightResponse createInsight(SentinelGatewayInput input) {
        return createResponse(input.context(), MODE, TITLE, LOCAL_SAFETY_NOTES);
    }

    public SentinelInsightResponse createFallback(SentinelGatewayInput input) {
        return createResponse(
                input.context(),
                "local-fallback",
                "Sentinel Local Fallback",
                FALLBACK_SAFETY_NOTES);
    }

    private static SentinelInsightResponse createResponse(
            SentinelInsightContext context,
            String mode,
            String title,
            List<String> safetyNotes) {
        LocalGuidance guidance = guidanceFor(context);
        return new SentinelInsightResponse(
                mode,
                PROVIDER,
                context.apiValue(),
                title,
                guidance.answer(),
                guidance.recommendations(),
                safetyNotes,
                guidance.nextActions(),
                Instant.now());
    }

    private static LocalGuidance guidanceFor(SentinelInsightContext context) {
        return switch (context) {
            case WISHLIST -> new LocalGuidance(
                    "This local gateway preview can outline how Sentinel may later summarize "
                            + "wishlist price history, target prices, and alerts. This local "
                            + "provider does not perform AI analysis or change your wishlist.",
                    List.of(
                            "Compare the current price with your saved target price.",
                            "Review recent price-history snapshots before buying.",
                            "Keep alert preferences aligned with the events you want to receive."),
                    List.of(
                            "Open Wishlist to review the item's recorded price history.",
                            "Wait for a verified price refresh before making a price-based decision."));
            case DEALS -> new LocalGuidance(
                    "This local gateway preview describes how Sentinel may later evaluate deal "
                            + "strength using NEXORA deal data. It does not call an external AI "
                            + "or activate a new deal-data provider.",
                    List.of(
                            "Compare the offer with the displayed historical or reference price.",
                            "Check the store and redirect destination before purchasing.",
                            "Use Wishlist tracking when you prefer to wait for a target price."),
                    List.of(
                            "Review the current Deals page for available store data.",
                            "Save a deal to Wishlist if you want NEXORA to track it."));
            case SECURITY -> new LocalGuidance(
                    "This is general local account-safety guidance. Sentinel has not inspected "
                            + "your devices, credentials, sessions, or account risk.",
                    List.of(
                            "Use a unique password and enable MFA where each gaming service supports it.",
                            "Treat unexpected login links and store redirects as suspicious.",
                            "Log out sessions you do not recognize using the provider's official controls."),
                    List.of(
                            "Review NEXORA's Security page for the implemented local safeguards.",
                            "Contact the affected provider directly if you suspect account takeover."));
            case GENERAL -> new LocalGuidance(
                    "Sentinel currently uses a deterministic local gateway foundation. It can "
                            + "route authenticated requests and return safe preview guidance, but "
                            + "no Gemini, OpenAI, or other external AI provider is active.",
                    List.of(
                            "Choose a Wishlist, Deals, or Security context for focused local guidance.",
                            "Verify important purchase and account decisions against current source data."),
                    List.of(
                            "Explore the existing NEXORA feature pages for live local data.",
                            "Review the Gemini provider safeguards before enabling it locally."));
        };
    }

    private record LocalGuidance(
            String answer,
            List<String> recommendations,
            List<String> nextActions) {
    }
}
