package com.nexora.api.auth.csrf;

public class AuthRequestProtectionException extends RuntimeException {

    public AuthRequestProtectionException() {
        super("The authentication request could not be verified");
    }
}
