package com.nexora.api.wishlist;

import com.nexora.api.notifications.AlertNotificationRequest;
import com.nexora.api.notifications.NotificationDispatcher;
import com.nexora.api.notifications.preferences.NotificationPreferenceResponse;
import com.nexora.api.notifications.preferences.UserNotificationPreferenceService;
import com.nexora.api.wishlist.persistence.WishlistAlertEvent;
import com.nexora.api.wishlist.persistence.WishlistAlertEventRepository;
import com.nexora.api.wishlist.persistence.WishlistItem;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("dev")
public class WishlistAlertEventRecorder {

    private static final Logger LOGGER =
            LoggerFactory.getLogger(WishlistAlertEventRecorder.class);

    private final WishlistAlertEventRepository wishlistAlertEventRepository;
    private final NotificationDispatcher notificationDispatcher;
    private final UserNotificationPreferenceService notificationPreferenceService;

    public WishlistAlertEventRecorder(
            WishlistAlertEventRepository wishlistAlertEventRepository,
            NotificationDispatcher notificationDispatcher,
            UserNotificationPreferenceService notificationPreferenceService) {
        this.wishlistAlertEventRepository = wishlistAlertEventRepository;
        this.notificationDispatcher = notificationDispatcher;
        this.notificationPreferenceService = notificationPreferenceService;
    }

    public boolean recordTargetReachedEvent(
            long userId,
            WishlistItem item,
            WishlistAlertEvaluation evaluation) {
        return recordTargetReachedEvent(userId, item, evaluation, null);
    }

    public boolean recordTargetReachedEvent(
            long userId,
            WishlistItem item,
            WishlistAlertEvaluation evaluation,
            String observationSource) {
        if (!evaluation.targetReached()) {
            return false;
        }

        boolean verified = WishlistRefreshSupport.isVerifiedProviderSource(observationSource);
        if (verified && (!observationSource.equals(item.getPriceSource())
                || !WishlistRefreshSupport.isUsdEligible(item.getCurrency())
                || !WishlistAlertEvaluator.evaluate(
                        item.getCurrentPrice(), item.getTargetPrice(), item.isAlertActive(), item.getCurrency()
                ).targetReached())) {
            return false;
        }

        WishlistAlertEvent savedEvent = wishlistAlertEventRepository.saveAndFlush(
                new WishlistAlertEvent(
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
                        "not-delivered",
                        observationSource,
                        null
                ));

        if (!verified) {
            return true;
        }

        try {
            NotificationPreferenceResponse preferences =
                    notificationPreferenceService.getPreferences(savedEvent.getUserId());
            if (!preferences.emailEnabled() || !preferences.targetReachedEnabled()) {
                return true;
            }

            AlertNotificationRequest notificationRequest = new AlertNotificationRequest(
                    savedEvent.getUserId(),
                    savedEvent.getWishlistItemId(),
                    savedEvent.getItemTitle(),
                    savedEvent.getStore(),
                    savedEvent.getCurrentPrice(),
                    savedEvent.getTargetPrice(),
                    savedEvent.getEvaluationState(),
                    savedEvent.getMessage()
            );
            notificationDispatcher.dispatchTargetReached(notificationRequest);
        } catch (RuntimeException ignored) {
            LOGGER.warn(
                    "Notification preference check or dispatch failed after saving alert event "
                            + "for wishlist item {}",
                    savedEvent.getWishlistItemId()
            );
        }
        return true;
    }
}
