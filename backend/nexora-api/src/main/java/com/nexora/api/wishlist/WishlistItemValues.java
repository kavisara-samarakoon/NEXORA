package com.nexora.api.wishlist;

import com.nexora.api.deals.CheapSharkDealMapper;

record WishlistItemValues(
        String title,
        String store,
        String currentPrice,
        String targetPrice,
        String lowestEver,
        String discount,
        String status,
        boolean alertActive,
        String priority,
        String externalGameId,
        String externalDealId,
        String currency,
        String thumbUrl,
        String priceSource,
        String lowestEverSource) {

    static final String SOURCE_USER_ENTERED = "user-entered";
    static final String SOURCE_UNVERIFIED = "unverified";

    static WishlistItemValues from(AddWishlistItemRequest request) {
        String currentPrice = request.currentPrice().trim();
        String targetPrice = request.targetPrice().trim();
        String lowestEver = valueOrDefault(request.lowestEver(), currentPrice);
        String lowestSource = isNotEstablished(lowestEver)
                ? SOURCE_UNVERIFIED
                : SOURCE_USER_ENTERED;
        return new WishlistItemValues(
                request.title().trim(),
                request.store().trim(),
                currentPrice,
                targetPrice,
                lowestEver,
                nullableValue(request.discount()),
                valueOrDefault(request.status(), "tracking"),
                request.alertActive() == null || request.alertActive(),
                valueOrDefault(request.priority(), "medium"),
                CheapSharkDealMapper.safeExternalGameId(request.externalGameId()),
                CheapSharkDealMapper.safeExternalDealId(request.externalDealId()),
                WishlistPriceParser.resolveCurrency(currentPrice, targetPrice, request.currency()),
                CheapSharkDealMapper.safeHttpsUrl(request.thumbUrl()),
                SOURCE_USER_ENTERED,
                lowestSource
        );
    }

    private static boolean isNotEstablished(String value) {
        return value == null || value.isBlank()
                || "Not established".equalsIgnoreCase(value.trim())
                || "—".equals(value.trim());
    }

    private static String valueOrDefault(String value, String defaultValue) {
        return value == null || value.isBlank() ? defaultValue : value.trim();
    }

    private static String nullableValue(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
