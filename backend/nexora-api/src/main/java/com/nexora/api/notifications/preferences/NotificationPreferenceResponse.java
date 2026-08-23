package com.nexora.api.notifications.preferences;

public record NotificationPreferenceResponse(
        boolean emailEnabled,
        boolean inAppEnabled,
        boolean targetReachedEnabled,
        boolean priceDropEnabled,
        boolean freeGameEnabled) {

    public static NotificationPreferenceResponse defaults() {
        return new NotificationPreferenceResponse(false, true, true, true, true);
    }
}
