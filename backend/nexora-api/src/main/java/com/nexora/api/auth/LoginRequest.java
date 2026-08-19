package com.nexora.api.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank @Size(max = 320) String emailOrUsername,
        @NotBlank @Size(max = 72) String password) {
}
