package com.nexora.api.auth;

import com.nexora.api.users.UserAccount;

public record AuthUserResponse(long id, String email, String username, String displayName) {

    static AuthUserResponse from(UserAccount user) {
        return new AuthUserResponse(
                user.getId(),
                user.getEmail(),
                user.getUsername(),
                user.getDisplayName()
        );
    }
}
