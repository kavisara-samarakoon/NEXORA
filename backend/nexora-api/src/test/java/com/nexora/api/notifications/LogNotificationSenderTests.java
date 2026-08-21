package com.nexora.api.notifications;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

class LogNotificationSenderTests {

    @Test
    void acceptsValidRequestWithoutExternalDelivery() {
        AlertNotificationRequest request = new AlertNotificationRequest(
                7L,
                42L,
                "New Game",
                "Steam",
                "$19.99",
                "$20.00",
                "target-reached",
                "Target price reached."
        );

        assertDoesNotThrow(() -> new LogNotificationSender().send(request));
    }
}
