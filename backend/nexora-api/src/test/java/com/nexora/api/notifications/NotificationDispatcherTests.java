package com.nexora.api.notifications;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class NotificationDispatcherTests {

    @Test
    void disabledNotificationsDoNotCallSender() {
        NotificationProperties properties = properties(false);
        NotificationSender sender = mock(NotificationSender.class);

        new NotificationDispatcher(properties, sender).dispatchTargetReached(request());

        verifyNoInteractions(sender);
    }

    @Test
    void enabledNotificationsCallSenderOnce() {
        NotificationProperties properties = properties(true);
        NotificationSender sender = mock(NotificationSender.class);
        AlertNotificationRequest request = request();

        new NotificationDispatcher(properties, sender).dispatchTargetReached(request);

        verify(sender).send(request);
    }

    @Test
    void senderFailureIsCaught() {
        NotificationProperties properties = properties(true);
        NotificationSender sender = mock(NotificationSender.class);
        AlertNotificationRequest request = request();
        doThrow(new IllegalStateException("sender unavailable")).when(sender).send(request);
        NotificationDispatcher dispatcher = new NotificationDispatcher(properties, sender);

        assertDoesNotThrow(() -> dispatcher.dispatchTargetReached(request));
        verify(sender).send(request);
    }

    @Test
    void nullRequestIsSafelySkippedWhenEnabled() {
        NotificationProperties properties = properties(true);
        NotificationSender sender = mock(NotificationSender.class);

        assertDoesNotThrow(() ->
                new NotificationDispatcher(properties, sender).dispatchTargetReached(null));

        verify(sender, never()).send(null);
    }

    private static NotificationProperties properties(boolean enabled) {
        NotificationProperties properties = new NotificationProperties();
        properties.setEnabled(enabled);
        properties.setProvider("log");
        return properties;
    }

    private static AlertNotificationRequest request() {
        return new AlertNotificationRequest(
                7L,
                42L,
                "New Game",
                "Steam",
                "$19.99",
                "$20.00",
                "target-reached",
                "Target price reached."
        );
    }
}
