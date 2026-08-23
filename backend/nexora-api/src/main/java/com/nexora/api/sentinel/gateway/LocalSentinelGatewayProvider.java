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
        return createResponse(input, MODE, TITLE, LOCAL_SAFETY_NOTES);
    }

    public SentinelInsightResponse createFallback(SentinelGatewayInput input) {
        return createResponse(
                input,
                "local-fallback",
                "Sentinel Local Fallback",
                FALLBACK_SAFETY_NOTES);
    }

    private static SentinelInsightResponse createResponse(
            SentinelGatewayInput input,
            String mode,
            String title,
            List<String> safetyNotes) {
        LocalGuidance guidance = guidanceFor(input);
        return new SentinelInsightResponse(
                mode,
                PROVIDER,
                input.context().apiValue(),
                title,
                guidance.answer(),
                guidance.recommendations(),
                safetyNotes,
                guidance.nextActions(),
                Instant.now());
    }

    private static LocalGuidance guidanceFor(SentinelGatewayInput input) {
        SentinelContextSummary summary = input.summary();
        return switch (input.context()) {
            case WISHLIST -> new LocalGuidance(
                    wishlistAnswer(summary),
                    List.of(
                            "Compare the current price with your saved target price.",
                            "Review recent price-history snapshots before buying.",
                            "Keep alert preferences aligned with the events you want to receive."),
                    List.of(
                            "Open Wishlist to review the item's recorded price history.",
                            "Wait for a verified price refresh before making a price-based decision."));
            case DEALS -> new LocalGuidance(
                    dealsAnswer(summary),
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
                    generalAnswer(summary),
                    List.of(
                            "Choose Wishlist, Deals, or Security context for more focused guidance.",
                            "Verify important purchase and account decisions against current source data."),
                    List.of(
                            "Explore the existing NEXORA feature pages for live local data.",
                            "Review the Gemini provider safeguards before enabling it locally."));
        };
    }

    private static String wishlistAnswer(SentinelContextSummary summary) {
        if (!summary.hasWishlistItems()) {
            return "The deterministic local provider found no active personal wishlist items in "
                    + "the bounded NEXORA summary. It does not perform AI analysis or change your wishlist.";
        }
        return "The deterministic local provider received a bounded summary of "
                + summary.activeWishlistItems() + " active wishlist item(s), including up to "
                + "five tracked prices, alerts, and limited recent snapshots. It does not perform "
                + "AI analysis or change your wishlist.";
    }

    private static String dealsAnswer(SentinelContextSummary summary) {
        if (!summary.hasDeals()) {
            return "The deterministic local provider found no current deal summaries. It does not "
                    + "call an external AI or activate a new deal-data provider.";
        }
        return "The deterministic local provider received " + summary.deals().size()
                + " bounded deal summaries from " + summary.publicDealCount()
                + " currently available NEXORA deal(s). Verify prices on the official store; this "
                + "provider does not perform AI analysis or activate another data provider.";
    }

    private static String generalAnswer(SentinelContextSummary summary) {
        return "The deterministic local provider received high-level NEXORA counts for "
                + summary.activeWishlistItems() + " wishlist item(s), "
                + summary.publicDealCount() + " public deal(s), and "
                + summary.liveGiveawayCount() + " live giveaway(s), plus only a bounded giveaway "
                + "summary. No Gemini or other external AI provider is active.";
    }

    private record LocalGuidance(
            String answer,
            List<String> recommendations,
            List<String> nextActions) {
    }
}
