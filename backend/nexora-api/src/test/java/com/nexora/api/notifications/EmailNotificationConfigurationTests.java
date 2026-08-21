package com.nexora.api.notifications;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(properties = {
        "nexora.notifications.enabled=true",
        "nexora.notifications.provider=email"
})
class EmailNotificationConfigurationTests {

    @MockitoBean
    private MailGateway mailGateway;

    @Autowired
    private NotificationProperties properties;

    @Autowired
    private List<NotificationSender> senders;

    @Autowired
    private List<MailGateway> mailGateways;

    @Test
    void emailProviderContextStartsWithOneSenderAndMockedGateway() {
        assertTrue(properties.isEnabled());
        assertEquals("email", properties.getProvider());
        assertEquals(1, senders.size());
        assertInstanceOf(EmailNotificationSender.class, senders.get(0));
        assertEquals(List.of(mailGateway), mailGateways);
    }
}
