package com.nexora.api.auth;

public record AuthResponse(String token, String tokenType, AuthUserResponse user) {
}
