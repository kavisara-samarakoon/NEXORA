package com.nexora.api.notifications;

import com.nexora.api.users.UserAccount;
import com.nexora.api.users.UserAccountStore;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Optional;

public class EmailNotificationSender implements NotificationSender {

    private static final Logger LOGGER =
            LoggerFactory.getLogger(EmailNotificationSender.class);

    private final UserAccountStore userAccountStore;
    private final MailGateway mailGateway;
    private final NotificationProperties properties;

    public EmailNotificationSender(
            UserAccountStore userAccountStore,
            MailGateway mailGateway,
            NotificationProperties properties) {
        this.userAccountStore = userAccountStore;
        this.mailGateway = mailGateway;
        this.properties = properties;
    }

    @Override
    public void send(AlertNotificationRequest request) {
        Optional<UserAccount> account = userAccountStore.findById(request.userId())
                .filter(UserAccount::isActive);
        if (account.isEmpty() || isBlank(account.get().getEmail())) {
            handleMissingRecipient(request);
            return;
        }

        String recipient = account.get().getEmail().trim();
        String subject = subjectPrefix() + " Target reached: " + display(request.itemTitle());
        String body = """
                Your NEXORA wishlist target has been reached.

                Item: %s
                Store: %s
                Current price: %s
                Target price: %s
                Details: %s

                This is an automated NEXORA alert.
                """.formatted(
                display(request.itemTitle()),
                display(request.store()),
                display(request.currentPrice()),
                display(request.targetPrice()),
                display(request.message())
        );

        mailGateway.send(
                recipient,
                properties.getEmail().getFrom(),
                subject,
                body
        );
    }

    private void handleMissingRecipient(AlertNotificationRequest request) {
        String message = "No active user email was found for target-reached alert userId="
                + request.userId();
        if (properties.getEmail().isFailOnMissingRecipient()) {
            throw new IllegalStateException(message);
        }
        LOGGER.warn("{}; skipping email notification", message);
    }

    private String subjectPrefix() {
        String configuredPrefix = properties.getEmail().getSubjectPrefix();
        return isBlank(configuredPrefix) ? "[NEXORA Alert]" : configuredPrefix.trim();
    }

    private static String display(String value) {
        return isBlank(value) ? "Not available" : value.trim();
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
