package com.nexora.api.auth;

import com.nexora.api.users.UserAccount;
import com.nexora.api.users.UserAccountConflictException;
import com.nexora.api.users.UserAccountStore;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

@Service
public class AuthService {

    private static final int BCRYPT_MAX_PASSWORD_BYTES = 72;

    private final UserAccountStore userAccountStore;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
            UserAccountStore userAccountStore,
            PasswordEncoder passwordEncoder,
            JwtService jwtService) {
        this.userAccountStore = userAccountStore;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public AuthResponse register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        String username = request.username().trim();
        String displayName = request.displayName().trim();
        validatePasswordByteLength(request.password());

        if (userAccountStore.emailExists(email)) {
            throw new UserAccountConflictException("Email is already registered");
        }
        if (userAccountStore.usernameExists(username)) {
            throw new UserAccountConflictException("Username is already registered");
        }

        try {
            UserAccount savedUser = userAccountStore.save(new UserAccount(
                    email,
                    username,
                    passwordEncoder.encode(request.password()),
                    displayName
            ));
            return authenticated(savedUser);
        } catch (DataIntegrityViolationException exception) {
            throw new UserAccountConflictException("Email or username is already registered");
        }
    }

    public AuthResponse login(LoginRequest request) {
        String identifier = request.emailOrUsername().trim();
        if (request.password().getBytes(StandardCharsets.UTF_8).length > BCRYPT_MAX_PASSWORD_BYTES) {
            throw invalidCredentials();
        }
        UserAccount user = userAccountStore.findByEmail(identifier.toLowerCase(Locale.ROOT))
                .or(() -> userAccountStore.findByUsername(identifier))
                .filter(UserAccount::isActive)
                .orElseThrow(AuthService::invalidCredentials);

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw invalidCredentials();
        }
        return authenticated(user);
    }

    public AuthUserResponse currentUser(long userId) {
        return userAccountStore.findById(userId)
                .filter(UserAccount::isActive)
                .map(AuthUserResponse::from)
                .orElseThrow(() -> new AuthenticationFailedException("Authentication is required"));
    }

    public AuthUserResponse updateDisplayName(long userId, UpdateProfileRequest request) {
        String displayName = request.displayName().trim();
        return userAccountStore.findById(userId)
                .filter(UserAccount::isActive)
                .flatMap(user -> userAccountStore.updateDisplayName(user.getId(), displayName))
                .map(AuthUserResponse::from)
                .orElseThrow(() -> new AuthenticationFailedException("Authentication is required"));
    }

    public AuthResponse refreshAccessToken(long userId) {
        return userAccountStore.findById(userId)
                .filter(UserAccount::isActive)
                .map(this::authenticated)
                .orElseThrow(() -> new AuthenticationFailedException(
                        "Refresh session is invalid or expired"));
    }

    private AuthResponse authenticated(UserAccount user) {
        return new AuthResponse(jwtService.generateToken(user), "Bearer", AuthUserResponse.from(user));
    }

    private static AuthenticationFailedException invalidCredentials() {
        return new AuthenticationFailedException("Invalid email, username, or password");
    }

    private static void validatePasswordByteLength(String password) {
        if (password.getBytes(StandardCharsets.UTF_8).length > BCRYPT_MAX_PASSWORD_BYTES) {
            throw new IllegalArgumentException("Password must not exceed 72 UTF-8 bytes");
        }
    }
}
