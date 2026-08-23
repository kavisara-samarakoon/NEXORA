package com.nexora.api.notifications.preferences;

import jakarta.validation.constraints.AssertTrue;

public record UpdateNotificationPreferenceRequest(
        Boolean emailEnabled,
        Boolean inAppEnabled,
        Boolean targetReachedEnabled,
        Boolean priceDropEnabled,
        Boolean freeGameEnabled) {

    @AssertTrue(message = "at least one notification preference must be provided")
    public boolean isAnyFieldProvided() {
        return emailEnabled != null
                || inAppEnabled != null
                || targetReachedEnabled != null
                || priceDropEnabled != null
                || freeGameEnabled != null;
    }
}
