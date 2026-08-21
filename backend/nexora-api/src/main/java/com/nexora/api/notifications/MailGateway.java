package com.nexora.api.notifications;

public interface MailGateway {

    void send(String to, String from, String subject, String body);
}
