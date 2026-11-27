package com.nexora.api.wishlist;

final class WishlistItemMapper {

    private WishlistItemMapper() {
    }

    static WishlistItem toResponse(
            com.nexora.api.wishlist.persistence.WishlistItem item) {
        String currency = WishlistPriceParser.establishStoredCurrency(
                item.getCurrentPrice(), item.getTargetPrice(), item.getCurrency());
        return new WishlistItem(
                item.getId(),
                item.getTitle(),
                item.getStore(),
                item.getCurrentPrice(),
                item.getTargetPrice(),
                item.getLowestEver(),
                item.getDiscount(),
                item.getStatus(),
                item.isAlertActive(),
                item.getPriority(),
                WishlistAlertEvaluator.evaluate(
                        item.getCurrentPrice(),
                        item.getTargetPrice(),
                        item.isAlertActive(),
                        currency
                ),
                item.getExternalGameId(),
                item.getExternalDealId(),
                currency,
                item.getThumbUrl(),
                item.getPriceSource(),
                item.getLowestEverSource()
        );
    }

    static WishlistItem toResponse(long id, WishlistItemValues values) {
        return new WishlistItem(
                id,
                values.title(),
                values.store(),
                values.currentPrice(),
                values.targetPrice(),
                values.lowestEver(),
                values.discount(),
                values.status(),
                values.alertActive(),
                values.priority(),
                WishlistAlertEvaluator.evaluate(
                        values.currentPrice(),
                        values.targetPrice(),
                        values.alertActive(),
                        values.currency()
                ),
                values.externalGameId(),
                values.externalDealId(),
                values.currency(),
                values.thumbUrl(),
                values.priceSource(),
                values.lowestEverSource()
        );
    }
}
