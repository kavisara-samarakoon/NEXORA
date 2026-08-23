package com.nexora.api.notifications.preferences;

import com.nexora.api.auth.AuthenticatedUserIdResolver;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me/notification-preferences")
public class UserNotificationPreferenceController {

    private final UserNotificationPreferenceService preferenceService;
    private final AuthenticatedUserIdResolver userIdResolver;

    public UserNotificationPreferenceController(
            UserNotificationPreferenceService preferenceService,
            AuthenticatedUserIdResolver userIdResolver) {
        this.preferenceService = preferenceService;
        this.userIdResolver = userIdResolver;
    }

    @GetMapping
    public NotificationPreferenceResponse getPreferences(Authentication authentication) {
        return preferenceService.getPreferences(userIdResolver.resolve(authentication));
    }

    @PatchMapping
    public NotificationPreferenceResponse updatePreferences(
            Authentication authentication,
            @Valid @RequestBody UpdateNotificationPreferenceRequest request) {
        return preferenceService.updatePreferences(
                userIdResolver.resolve(authentication), request);
    }
}
