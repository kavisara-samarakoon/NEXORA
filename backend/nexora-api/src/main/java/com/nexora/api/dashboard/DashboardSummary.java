package com.nexora.api.dashboard;

public record DashboardSummary(
        int activeDealsCount,
        int activeGiveawaysCount,
        int wishlistItemsCount,
        int activePriceAlertsCount,
        int bestDiscountValue,
        String bestDiscountTitle,
        String databaseStatus,
        String sentinelStatus
) {
}
