package com.nexora.api.notifications;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class NotificationDispatcher {

    private static final Logger LOGGER =
            LoggerFactory.getLogger(NotificationDispatcher.class);

    private final NotificationProperties properties;
    private final NotificationSender notificationSender;

    public NotificationDispatcher(
            NotificationProperties properties,
            NotificationSender notificationSender) {
        this.properties = properties;
        this.notificationSender = notificationSender;
    }

    public void dispatchTargetReached(AlertNotificationRequest request) {
        if (!properties.isEnabled()) {
            return;
        }
        if (request == null) {
            LOGGER.warn("Target-reached notification request was missing; skipping delivery");
            return;
        }

        try {
            notificationSender.send(request);
            LOGGER.info(
                    "Target-reached notification dispatched with provider {} for "
                            + "wishlist item {}",
                    properties.getProvider(),
                    request.wishlistItemId()
            );
        } catch (RuntimeException exception) {
            LOGGER.warn(
                    "Target-reached notification failed for wishlist item {} ({})",
                    request.wishlistItemId(),
                    exception.getMessage()
            );
        }
    }
}
