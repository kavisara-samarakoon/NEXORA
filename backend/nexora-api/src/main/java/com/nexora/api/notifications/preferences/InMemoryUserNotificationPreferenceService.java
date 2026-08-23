package com.nexora.api.notifications.preferences;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Profile("!dev")
public class InMemoryUserNotificationPreferenceService
        implements UserNotificationPreferenceService {

    private final Map<Long, NotificationPreferenceResponse> preferencesByUserId =
            new ConcurrentHashMap<>();

    @Override
    public NotificationPreferenceResponse getPreferences(long userId) {
        return preferencesByUserId.computeIfAbsent(
                userId,
                ignored -> NotificationPreferenceResponse.defaults());
    }

    @Override
    public synchronized NotificationPreferenceResponse updatePreferences(
            long userId,
            UpdateNotificationPreferenceRequest request) {
        NotificationPreferenceResponse current = getPreferences(userId);
        NotificationPreferenceResponse updated = new NotificationPreferenceResponse(
                valueOrCurrent(request.emailEnabled(), current.emailEnabled()),
                valueOrCurrent(request.inAppEnabled(), current.inAppEnabled()),
                valueOrCurrent(request.targetReachedEnabled(), current.targetReachedEnabled()),
                valueOrCurrent(request.priceDropEnabled(), current.priceDropEnabled()),
                valueOrCurrent(request.freeGameEnabled(), current.freeGameEnabled()));
        preferencesByUserId.put(userId, updated);
        return updated;
    }

    private static boolean valueOrCurrent(Boolean value, boolean current) {
        return value == null ? current : value;
    }
}
