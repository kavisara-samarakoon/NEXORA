package com.nexora.api.notifications.preferences;

public interface UserNotificationPreferenceService {

    NotificationPreferenceResponse getPreferences(long userId);

    NotificationPreferenceResponse updatePreferences(
            long userId,
            UpdateNotificationPreferenceRequest request);
}
