package com.nexora.api.notifications;

import com.nexora.api.users.UserAccount;
import com.nexora.api.users.UserAccountStore;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class EmailNotificationSenderTests {

    @Test
    void resolvesUserEmailAndSendsTargetReachedMessage() {
        UserAccountStore userAccountStore = mock(UserAccountStore.class);
        MailGateway mailGateway = mock(MailGateway.class);
        when(userAccountStore.findById(7L)).thenReturn(Optional.of(user("player@example.com")));
        EmailNotificationSender sender = new EmailNotificationSender(
                userAccountStore, mailGateway, properties());

        sender.send(request());

        ArgumentCaptor<String> to = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> from = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> subject = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(mailGateway).send(
                to.capture(), from.capture(), subject.capture(), body.capture());
        assertAll(
                () -> assertEquals("player@example.com", to.getValue()),
                () -> assertEquals("no-reply@nexora.local", from.getValue()),
                () -> assertEquals(
                        "[NEXORA Alert] Target reached: New Game",
                        subject.getValue()),
                () -> assertContains(body.getValue(), "Item: New Game"),
                () -> assertContains(body.getValue(), "Store: Steam"),
                () -> assertContains(body.getValue(), "Current price: $19.99"),
                () -> assertContains(body.getValue(), "Target price: $20.00"),
                () -> assertContains(body.getValue(), "Details: Target price reached."),
                () -> assertContains(body.getValue(), "automated NEXORA alert")
        );
    }

    @Test
    void missingUserIsSkippedWithoutThrowing() {
        UserAccountStore userAccountStore = mock(UserAccountStore.class);
        MailGateway mailGateway = mock(MailGateway.class);
        when(userAccountStore.findById(7L)).thenReturn(Optional.empty());
        EmailNotificationSender sender = new EmailNotificationSender(
                userAccountStore, mailGateway, properties());

        assertDoesNotThrow(() -> sender.send(request()));

        verify(mailGateway, never()).send(
                anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void blankUserEmailIsSkippedWithoutThrowing() {
        UserAccountStore userAccountStore = mock(UserAccountStore.class);
        MailGateway mailGateway = mock(MailGateway.class);
        when(userAccountStore.findById(7L)).thenReturn(Optional.of(user("  ")));
        EmailNotificationSender sender = new EmailNotificationSender(
                userAccountStore, mailGateway, properties());

        assertDoesNotThrow(() -> sender.send(request()));

        verify(mailGateway, never()).send(
                anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void mailGatewayFailurePropagatesForDispatcherToContain() {
        UserAccountStore userAccountStore = mock(UserAccountStore.class);
        MailGateway mailGateway = mock(MailGateway.class);
        when(userAccountStore.findById(7L)).thenReturn(Optional.of(user("player@example.com")));
        doThrow(new IllegalStateException("SMTP unavailable")).when(mailGateway)
                .send(anyString(), anyString(), anyString(), anyString());
        EmailNotificationSender sender = new EmailNotificationSender(
                userAccountStore, mailGateway, properties());

        assertThrows(IllegalStateException.class, () -> sender.send(request()));
    }

    private static NotificationProperties properties() {
        return new NotificationProperties();
    }

    private static UserAccount user(String email) {
        return new UserAccount(email, "player", "password-hash", "Player");
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

    private static void assertContains(String actual, String expected) {
        org.junit.jupiter.api.Assertions.assertTrue(
                actual.contains(expected),
                () -> "Expected message to contain: " + expected
        );
    }
}
