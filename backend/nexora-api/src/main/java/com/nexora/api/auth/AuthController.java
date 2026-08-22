package com.nexora.api.auth;

import com.nexora.api.auth.session.RefreshCookieService;
import com.nexora.api.auth.session.RefreshSessionService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final AuthenticatedUserIdResolver userIdResolver;
    private final RefreshSessionService refreshSessionService;
    private final RefreshCookieService refreshCookieService;

    public AuthController(
            AuthService authService,
            AuthenticatedUserIdResolver userIdResolver,
            RefreshSessionService refreshSessionService,
            RefreshCookieService refreshCookieService) {
        this.authService = authService;
        this.userIdResolver = userIdResolver;
        this.refreshSessionService = refreshSessionService;
        this.refreshCookieService = refreshCookieService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return withRefreshCookie(response, HttpStatus.CREATED);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return withRefreshCookie(response, HttpStatus.OK);
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(HttpServletRequest request) {
        RefreshSessionService.IssuedRefreshToken refreshToken =
                refreshSessionService.rotate(refreshCookieService.readToken(request));
        try {
            AuthResponse response = authService.refreshAccessToken(refreshToken.userId());
            return ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE, refreshCookieService.issueCookie(refreshToken.token()))
                    .body(response);
        } catch (AuthenticationFailedException exception) {
            refreshSessionService.revokeIfPresent(refreshToken.token());
            throw exception;
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        refreshSessionService.revokeIfPresent(refreshCookieService.readToken(request));
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, refreshCookieService.clearCookie())
                .build();
    }

    @GetMapping("/me")
    public AuthUserResponse me(Authentication authentication) {
        return authService.currentUser(userIdResolver.resolve(authentication));
    }

    private ResponseEntity<AuthResponse> withRefreshCookie(AuthResponse response, HttpStatus status) {
        RefreshSessionService.IssuedRefreshToken refreshToken =
                refreshSessionService.issue(response.user().id());
        return ResponseEntity.status(status)
                .header(HttpHeaders.SET_COOKIE, refreshCookieService.issueCookie(refreshToken.token()))
                .body(response);
    }
}
