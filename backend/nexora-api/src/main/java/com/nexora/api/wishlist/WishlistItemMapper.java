package com.nexora.api.wishlist;

final class WishlistItemMapper {

    private WishlistItemMapper() {
    }

    static WishlistItem toResponse(
            com.nexora.api.wishlist.persistence.WishlistItem item) {
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
                item.getPriority()
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
                values.priority()
        );
    }
}
