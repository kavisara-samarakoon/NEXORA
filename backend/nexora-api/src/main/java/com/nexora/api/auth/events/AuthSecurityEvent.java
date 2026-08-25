package com.nexora.api.auth.events;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "auth_security_events")
public class AuthSecurityEvent {

    private static final String AUTH_SOURCE = "auth";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 64)
    private AuthSecurityEventType eventType;

    @Enumerated(EnumType.STRING)
    @Column(name = "outcome", nullable = false, length = 32)
    private AuthSecurityEventOutcome outcome;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "reason_code", length = 80)
    private String reasonCode;

    @Column(name = "source", nullable = false, length = 64)
    private String source;

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected AuthSecurityEvent() {
    }

    static AuthSecurityEvent recorded(
            AuthSecurityEventType eventType,
            AuthSecurityEventOutcome outcome,
            Long userId,
            AuthSecurityEventReasonCode reasonCode,
            LocalDateTime occurredAt) {
        AuthSecurityEvent event = new AuthSecurityEvent();
        event.eventType = Objects.requireNonNull(eventType);
        event.outcome = Objects.requireNonNull(outcome);
        event.userId = userId;
        event.reasonCode = reasonCode == null ? null : reasonCode.code();
        event.source = AUTH_SOURCE;
        event.occurredAt = Objects.requireNonNull(occurredAt);
        event.createdAt = occurredAt;
        return event;
    }

    public Long getId() {
        return id;
    }

    public AuthSecurityEventType getEventType() {
        return eventType;
    }

    public AuthSecurityEventOutcome getOutcome() {
        return outcome;
    }

    public Long getUserId() {
        return userId;
    }

    public String getReasonCode() {
        return reasonCode;
    }

    public String getSource() {
        return source;
    }

    public LocalDateTime getOccurredAt() {
        return occurredAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    void assignId(long value) {
        if (id == null) {
            id = value;
        }
    }
}
