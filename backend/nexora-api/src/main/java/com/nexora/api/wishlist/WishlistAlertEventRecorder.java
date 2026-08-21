package com.nexora.api.wishlist;

import com.nexora.api.wishlist.persistence.WishlistAlertEvent;
import com.nexora.api.wishlist.persistence.WishlistAlertEventRepository;
import com.nexora.api.wishlist.persistence.WishlistItem;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("dev")
public class WishlistAlertEventRecorder {

    private final WishlistAlertEventRepository wishlistAlertEventRepository;

    public WishlistAlertEventRecorder(WishlistAlertEventRepository wishlistAlertEventRepository) {
        this.wishlistAlertEventRepository = wishlistAlertEventRepository;
    }

    public void recordTargetReachedEvent(
            long userId,
            WishlistItem item,
            WishlistAlertEvaluation evaluation) {
        if (!evaluation.targetReached()) {
            return;
        }

        wishlistAlertEventRepository.saveAndFlush(new WishlistAlertEvent(
                null,
                userId,
                item.getId(),
                item.getTitle(),
                item.getStore(),
                item.getCurrentPrice(),
                item.getTargetPrice(),
                evaluation.state(),
                true,
                evaluation.message(),
                null
        ));
    }
}
