package com.nexora.api.notifications.preferences;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Entity
@Table(
        name = "notification_preferences",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_notification_preferences_user",
                columnNames = "user_id"))
public class NotificationPreference {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, updatable = false)
    private Long userId;

    @Column(name = "email_enabled", nullable = false)
    private boolean emailEnabled;

    @Column(name = "in_app_enabled", nullable = false)
    private boolean inAppEnabled;

    @Column(name = "target_reached_enabled", nullable = false)
    private boolean targetReachedEnabled;

    @Column(name = "price_drop_enabled", nullable = false)
    private boolean priceDropEnabled;

    @Column(name = "free_game_enabled", nullable = false)
    private boolean freeGameEnabled;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected NotificationPreference() {
    }

    public NotificationPreference(long userId) {
        NotificationPreferenceResponse defaults = NotificationPreferenceResponse.defaults();
        this.userId = userId;
        this.emailEnabled = defaults.emailEnabled();
        this.inAppEnabled = defaults.inAppEnabled();
        this.targetReachedEnabled = defaults.targetReachedEnabled();
        this.priceDropEnabled = defaults.priceDropEnabled();
        this.freeGameEnabled = defaults.freeGameEnabled();
        this.createdAt = nowUtc();
        this.updatedAt = createdAt;
    }

    public Long getUserId() {
        return userId;
    }

    public NotificationPreferenceResponse toResponse() {
        return new NotificationPreferenceResponse(
                emailEnabled,
                inAppEnabled,
                targetReachedEnabled,
                priceDropEnabled,
                freeGameEnabled);
    }

    public void update(UpdateNotificationPreferenceRequest request) {
        emailEnabled = valueOrCurrent(request.emailEnabled(), emailEnabled);
        inAppEnabled = valueOrCurrent(request.inAppEnabled(), inAppEnabled);
        targetReachedEnabled = valueOrCurrent(
                request.targetReachedEnabled(), targetReachedEnabled);
        priceDropEnabled = valueOrCurrent(request.priceDropEnabled(), priceDropEnabled);
        freeGameEnabled = valueOrCurrent(request.freeGameEnabled(), freeGameEnabled);
        updatedAt = nowUtc();
    }

    private static boolean valueOrCurrent(Boolean value, boolean current) {
        return value == null ? current : value;
    }

    private static LocalDateTime nowUtc() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }
}
