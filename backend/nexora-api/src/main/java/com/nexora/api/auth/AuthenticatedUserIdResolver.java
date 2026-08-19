package com.nexora.api.auth;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component
public class AuthenticatedUserIdResolver {

    public long resolve(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw authenticationRequired();
        }

        try {
            long userId = Long.parseLong(authentication.getName());
            if (userId <= 0) {
                throw authenticationRequired();
            }
            return userId;
        } catch (NumberFormatException exception) {
            throw authenticationRequired();
        }
    }

    private static AuthenticationFailedException authenticationRequired() {
        return new AuthenticationFailedException("Authentication is required");
    }
}
