package com.nexora.api.notifications;

import com.nexora.api.users.UserAccountStore;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;

@Configuration(proxyBeanMethods = false)
public class NotificationSenderConfiguration {

    @Bean
    @ConditionalOnProperty(
            prefix = "nexora.notifications",
            name = "provider",
            havingValue = "log",
            matchIfMissing = true
    )
    @ConditionalOnMissingBean(NotificationSender.class)
    NotificationSender logNotificationSender() {
        return new LogNotificationSender();
    }

    @Bean
    @ConditionalOnProperty(
            prefix = "nexora.notifications",
            name = "provider",
            havingValue = "email"
    )
    @ConditionalOnMissingBean(MailGateway.class)
    MailGateway springMailGateway(ObjectProvider<JavaMailSender> mailSenderProvider) {
        return new SpringMailGateway(mailSenderProvider);
    }

    @Bean
    @ConditionalOnProperty(
            prefix = "nexora.notifications",
            name = "provider",
            havingValue = "email"
    )
    @ConditionalOnMissingBean(NotificationSender.class)
    NotificationSender emailNotificationSender(
            UserAccountStore userAccountStore,
            MailGateway mailGateway,
            NotificationProperties properties) {
        return new EmailNotificationSender(userAccountStore, mailGateway, properties);
    }
}
