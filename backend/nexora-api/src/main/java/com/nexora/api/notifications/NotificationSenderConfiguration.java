package com.nexora.api.notifications;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

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
}
