package com.nexora.api.notifications;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = {
        "nexora.notifications.enabled=true",
        "nexora.notifications.provider=log"
})
class NotificationConfigurationTests {

    @Autowired
    private NotificationProperties properties;

    @Autowired
    private NotificationDispatcher dispatcher;

    @Autowired
    private List<NotificationSender> senders;

    @Test
    void enabledLogProviderContextStartsWithOneSender() {
        assertTrue(properties.isEnabled());
        assertInstanceOf(NotificationDispatcher.class, dispatcher);
        assertEquals(1, senders.size());
        assertInstanceOf(LogNotificationSender.class, senders.get(0));
    }
}
