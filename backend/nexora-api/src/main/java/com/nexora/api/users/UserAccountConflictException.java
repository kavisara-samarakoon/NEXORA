package com.nexora.api.users;

public class UserAccountConflictException extends RuntimeException {

    public UserAccountConflictException(String message) {
        super(message);
    }
}
