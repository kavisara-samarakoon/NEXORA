package com.nexora.api.notifications;

public interface NotificationSender {

    void send(AlertNotificationRequest request);
}
