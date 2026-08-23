package com.nexora.api.notifications.preferences;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;

class InMemoryUserNotificationPreferenceServiceTests {

    @Test
    void createsDefaultsAndAppliesPartialUpdatesPerUser() {
        InMemoryUserNotificationPreferenceService service =
                new InMemoryUserNotificationPreferenceService();

        NotificationPreferenceResponse defaults = service.getPreferences(7L);
        NotificationPreferenceResponse updated = service.updatePreferences(
                7L,
                new UpdateNotificationPreferenceRequest(
                        true, null, false, null, null));
        NotificationPreferenceResponse secondUser = service.getPreferences(8L);

        assertAll(
                () -> assertEquals(
                        new NotificationPreferenceResponse(
                                false, true, true, true, true),
                        defaults),
                () -> assertEquals(
                        new NotificationPreferenceResponse(
                                true, true, false, true, true),
                        updated),
                () -> assertEquals(NotificationPreferenceResponse.defaults(), secondUser),
                () -> assertEquals(updated, service.getPreferences(7L))
        );
    }
}
