package com.nexora.api.notifications.preferences;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Profile("dev")
public class DatabaseUserNotificationPreferenceService
        implements UserNotificationPreferenceService {

    private final NotificationPreferenceRepository repository;

    public DatabaseUserNotificationPreferenceService(
            NotificationPreferenceRepository repository) {
        this.repository = repository;
    }

    @Override
    @Transactional
    public NotificationPreferenceResponse getPreferences(long userId) {
        return findOrCreate(userId).toResponse();
    }

    @Override
    @Transactional
    public NotificationPreferenceResponse updatePreferences(
            long userId,
            UpdateNotificationPreferenceRequest request) {
        NotificationPreference preference = findOrCreate(userId);
        preference.update(request);
        return repository.saveAndFlush(preference).toResponse();
    }

    private NotificationPreference findOrCreate(long userId) {
        return repository.findByUserId(userId)
                .orElseGet(() -> repository.saveAndFlush(
                        new NotificationPreference(userId)));
    }
}
