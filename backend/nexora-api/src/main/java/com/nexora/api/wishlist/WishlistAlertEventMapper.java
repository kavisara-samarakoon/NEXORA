package com.nexora.api.wishlist;

import com.nexora.api.wishlist.persistence.WishlistAlertEvent;

import java.time.LocalDateTime;

final class WishlistAlertEventMapper {

    private WishlistAlertEventMapper() {
    }

    static WishlistAlertEventResponse toResponse(WishlistAlertEvent event) {
        return new WishlistAlertEventResponse(
                event.getId(),
                event.getWishlistItemId(),
                event.getItemTitle(),
                event.getStore(),
                event.getCurrentPrice(),
                event.getTargetPrice(),
                event.getEvaluationState(),
                event.isTargetReached(),
                event.getMessage(),
                event.getCreatedAt(),
                event.getDeliveryStatus(),
                event.getObservationSource()
        );
    }

    static WishlistAlertEventResponse toResponse(
            long id,
            WishlistItem item,
            LocalDateTime createdAt,
            String observationSource) {
        WishlistAlertEvaluation evaluation = item.alertEvaluation();
        return new WishlistAlertEventResponse(
                id,
                item.id(),
                item.title(),
                item.store(),
                item.currentPrice(),
                item.targetPrice(),
                evaluation.state(),
                evaluation.targetReached(),
                evaluation.message(),
                createdAt,
                "not-delivered",
                observationSource
        );
    }

    static WishlistAlertEventResponse toResponse(
            long id, WishlistItem item, LocalDateTime createdAt) {
        return toResponse(id, item, createdAt, null);
    }
}
