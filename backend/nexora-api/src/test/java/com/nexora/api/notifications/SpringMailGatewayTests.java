package com.nexora.api.notifications;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SpringMailGatewayTests {

    @Test
    void delegatesMessageToConfiguredJavaMailSender() {
        JavaMailSender mailSender = mock(JavaMailSender.class);
        ObjectProvider<JavaMailSender> provider = provider();
        when(provider.getIfAvailable()).thenReturn(mailSender);
        SpringMailGateway gateway = new SpringMailGateway(provider);

        gateway.send(
                "player@example.com",
                "no-reply@nexora.local",
                "Target reached",
                "Message body"
        );

        ArgumentCaptor<SimpleMailMessage> messageCaptor =
                ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(messageCaptor.capture());
        SimpleMailMessage message = messageCaptor.getValue();
        assertAll(
                () -> assertEquals("player@example.com", message.getTo()[0]),
                () -> assertEquals("no-reply@nexora.local", message.getFrom()),
                () -> assertEquals("Target reached", message.getSubject()),
                () -> assertEquals("Message body", message.getText())
        );
    }

    @Test
    void missingMailConfigurationFailsOnlyWhenDeliveryIsAttempted() {
        ObjectProvider<JavaMailSender> provider = provider();
        when(provider.getIfAvailable()).thenReturn(null);
        SpringMailGateway gateway = new SpringMailGateway(provider);

        assertThrows(IllegalStateException.class, () -> gateway.send(
                "player@example.com",
                "no-reply@nexora.local",
                "Target reached",
                "Message body"
        ));
    }

    @SuppressWarnings("unchecked")
    private static ObjectProvider<JavaMailSender> provider() {
        return mock(ObjectProvider.class);
    }
}
