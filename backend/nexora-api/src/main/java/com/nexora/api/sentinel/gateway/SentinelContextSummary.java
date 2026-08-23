package com.nexora.api.sentinel.gateway;

import java.time.LocalDateTime;
import java.util.List;

public record SentinelContextSummary(
        SentinelInsightContext context,
        int activeWishlistItems,
        int activeAlerts,
        int alertEventCount,
        int publicDealCount,
        int liveGiveawayCount,
        List<SentinelWishlistContext> wishlistItems,
        List<SentinelAlertContext> recentAlerts,
        List<SentinelDealContext> deals,
        List<SentinelGiveawayContext> giveaways) {

    public static final int MAX_PROMPT_CHARACTERS = 3_500;
    private static final String TRUNCATED_NOTE = "\n[Context truncated to the configured safety limit.]";

    public SentinelContextSummary {
        if (context == null) {
            context = SentinelInsightContext.GENERAL;
        }
        wishlistItems = copy(wishlistItems);
        recentAlerts = copy(recentAlerts);
        deals = copy(deals);
        giveaways = copy(giveaways);
    }

    public static SentinelContextSummary empty(SentinelInsightContext context) {
        return new SentinelContextSummary(
                context, 0, 0, 0, 0, 0,
                List.of(), List.of(), List.of(), List.of());
    }

    public String toPromptText() {
        StringBuilder summary = new StringBuilder();
        switch (context) {
            case WISHLIST -> appendWishlist(summary);
            case DEALS -> appendDeals(summary);
            case GENERAL -> appendGeneral(summary);
            case SECURITY -> summary.append(
                    "Security context: no credentials, sessions, email addresses, tokens, "
                            + "or private account-risk data were supplied. NEXORA cannot inspect "
                            + "or score account security.");
        }
        return bounded(summary.toString());
    }

    public boolean hasWishlistItems() {
        return !wishlistItems.isEmpty();
    }

    public boolean hasDeals() {
        return !deals.isEmpty();
    }

    private void appendWishlist(StringBuilder summary) {
        summary.append("Wishlist totals: active items=").append(activeWishlistItems)
                .append(", active alerts=").append(activeAlerts)
                .append(", recorded alert events=").append(alertEventCount).append('.');
        for (int index = 0; index < wishlistItems.size(); index++) {
            SentinelWishlistContext item = wishlistItems.get(index);
            summary.append("\nWishlist item ").append(index + 1).append(": title=")
                    .append(safe(item.title())).append(", store=").append(safe(item.store()))
                    .append(", current price=").append(safe(item.currentPrice()))
                    .append(", target price=").append(safe(item.targetPrice()))
                    .append(", alert active=").append(item.alertActive())
                    .append(", priority=").append(safe(item.priority()))
                    .append(", status=").append(safe(item.status()))
                    .append(", alert state=").append(safe(item.alertState()))
                    .append(", alert message=").append(safe(item.alertMessage())).append('.');
            appendPrices(summary, item.recentPrices());
        }
        for (int index = 0; index < recentAlerts.size(); index++) {
            SentinelAlertContext alert = recentAlerts.get(index);
            summary.append("\nRecent alert ").append(index + 1).append(": item=")
                    .append(safe(alert.itemTitle())).append(", store=").append(safe(alert.store()))
                    .append(", current price=").append(safe(alert.currentPrice()))
                    .append(", target price=").append(safe(alert.targetPrice()))
                    .append(", state=").append(safe(alert.evaluationState()))
                    .append(", target reached=").append(alert.targetReached())
                    .append(", message=").append(safe(alert.message()))
                    .append(", observed at=").append(time(alert.createdAt())).append('.');
        }
    }

    private static void appendPrices(
            StringBuilder summary,
            List<SentinelPriceHistoryContext> prices) {
        for (int index = 0; index < prices.size(); index++) {
            SentinelPriceHistoryContext price = prices.get(index);
            summary.append("\n  Recent price ").append(index + 1).append(": label=")
                    .append(safe(price.priceLabel())).append(", numeric amount=")
                    .append(price.priceAmount() == null
                            ? "not available"
                            : price.priceAmount().toPlainString())
                    .append(", currency=").append(safe(price.currency()))
                    .append(", source=").append(safe(price.source()))
                    .append(", observed at=").append(time(price.observedAt())).append('.');
        }
    }

    private void appendDeals(StringBuilder summary) {
        summary.append("Public deal count=").append(publicDealCount).append('.');
        for (int index = 0; index < deals.size(); index++) {
            SentinelDealContext deal = deals.get(index);
            summary.append("\nDeal ").append(index + 1).append(": title=")
                    .append(safe(deal.title())).append(", store=").append(safe(deal.store()))
                    .append(", current price=").append(safe(deal.priceNew()))
                    .append(", reference price=").append(safe(deal.priceOld()))
                    .append(", discount value=").append(deal.discountValue()).append("%")
                    .append(", discount label=").append(safe(deal.discount()))
                    .append(", status=").append(safe(deal.status()))
                    .append(", category=").append(safe(deal.category())).append('.');
        }
    }

    private void appendGeneral(StringBuilder summary) {
        summary.append("NEXORA counts: active wishlist items=").append(activeWishlistItems)
                .append(", active alerts=").append(activeAlerts)
                .append(", public deals=").append(publicDealCount)
                .append(", live giveaways=").append(liveGiveawayCount).append('.');
        for (int index = 0; index < giveaways.size(); index++) {
            SentinelGiveawayContext giveaway = giveaways.get(index);
            summary.append("\nGiveaway ").append(index + 1).append(": title=")
                    .append(safe(giveaway.title())).append(", platform=")
                    .append(safe(giveaway.platformLabel())).append(", remaining=")
                    .append(safe(giveaway.timer())).append(", days remaining=")
                    .append(giveaway.daysRemaining()).append(", original price=")
                    .append(safe(giveaway.originalPrice())).append(", tag=")
                    .append(safe(giveaway.tag())).append('.');
        }
    }

    private static String bounded(String value) {
        if (value.length() <= MAX_PROMPT_CHARACTERS) {
            return value;
        }
        int contentLimit = MAX_PROMPT_CHARACTERS - TRUNCATED_NOTE.length();
        return value.substring(0, contentLimit).stripTrailing() + TRUNCATED_NOTE;
    }

    private static String safe(String value) {
        return SentinelPromptSanitizer.contextValue(value);
    }

    private static String time(LocalDateTime value) {
        return value == null ? "not available" : value.toString();
    }

    private static <T> List<T> copy(List<T> values) {
        return values == null ? List.of() : List.copyOf(values);
    }
}
