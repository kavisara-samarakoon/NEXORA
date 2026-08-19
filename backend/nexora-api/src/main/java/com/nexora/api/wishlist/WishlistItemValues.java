package com.nexora.api.wishlist;

record WishlistItemValues(
        String title,
        String store,
        String currentPrice,
        String targetPrice,
        String lowestEver,
        String discount,
        String status,
        boolean alertActive,
        String priority) {

    static WishlistItemValues from(AddWishlistItemRequest request) {
        String currentPrice = request.currentPrice().trim();
        return new WishlistItemValues(
                request.title().trim(),
                request.store().trim(),
                currentPrice,
                request.targetPrice().trim(),
                valueOrDefault(request.lowestEver(), currentPrice),
                nullableValue(request.discount()),
                valueOrDefault(request.status(), "tracking"),
                request.alertActive() == null || request.alertActive(),
                valueOrDefault(request.priority(), "medium")
        );
    }

    private static String valueOrDefault(String value, String defaultValue) {
        return value == null || value.isBlank() ? defaultValue : value.trim();
    }

    private static String nullableValue(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
