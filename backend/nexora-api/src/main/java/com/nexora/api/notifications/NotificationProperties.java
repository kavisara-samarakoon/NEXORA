package com.nexora.api.notifications;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "nexora.notifications")
public class NotificationProperties {

    private boolean enabled;
    private String provider = "log";
    private final Email email = new Email();

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getProvider() {
        return provider;
    }

    public void setProvider(String provider) {
        this.provider = provider;
    }

    public Email getEmail() {
        return email;
    }

    public static class Email {

        private String from = "no-reply@nexora.local";
        private String subjectPrefix = "[NEXORA Alert]";
        private boolean failOnMissingRecipient;

        public String getFrom() {
            return from;
        }

        public void setFrom(String from) {
            this.from = from;
        }

        public String getSubjectPrefix() {
            return subjectPrefix;
        }

        public void setSubjectPrefix(String subjectPrefix) {
            this.subjectPrefix = subjectPrefix;
        }

        public boolean isFailOnMissingRecipient() {
            return failOnMissingRecipient;
        }

        public void setFailOnMissingRecipient(boolean failOnMissingRecipient) {
            this.failOnMissingRecipient = failOnMissingRecipient;
        }
    }
}
