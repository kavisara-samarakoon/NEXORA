package com.nexora.api.notifications;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class LogNotificationSender implements NotificationSender {

    private static final Logger LOGGER =
            LoggerFactory.getLogger(LogNotificationSender.class);

    @Override
    public void send(AlertNotificationRequest request) {
        LOGGER.info(
                "NEXORA alert notification prepared: userId={}, item={}, store={}, "
                        + "currentPrice={}, targetPrice={}",
                request.userId(),
                request.itemTitle(),
                request.store(),
                request.currentPrice(),
                request.targetPrice()
        );
    }
}
