package com.nexora.api.auth;

import com.nexora.api.auth.abuse.AuthAbuseGuard;
import com.nexora.api.auth.abuse.AuthAbuseLimit;
import com.nexora.api.auth.csrf.AuthBrowserRequestGuard;
import com.nexora.api.auth.csrf.AuthCsrfService;
import com.nexora.api.auth.csrf.AuthCsrfTokenResponse;
import com.nexora.api.auth.events.AuthSecurityEventReasonCode;
import com.nexora.api.auth.events.AuthSecurityEventService;
import com.nexora.api.auth.session.RefreshCookieService;
import com.nexora.api.auth.session.RefreshSessionService;
import com.nexora.api.users.UserAccountConflictException;
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
    private final AuthCsrfService csrfService;
    private final AuthBrowserRequestGuard browserRequestGuard;
    private final AuthSecurityEventService securityEventService;
    private final AuthAbuseGuard abuseGuard;

    public AuthController(
            AuthService authService,
            AuthenticatedUserIdResolver userIdResolver,
            RefreshSessionService refreshSessionService,
            RefreshCookieService refreshCookieService,
            AuthCsrfService csrfService,
            AuthBrowserRequestGuard browserRequestGuard,
            AuthSecurityEventService securityEventService,
            AuthAbuseGuard abuseGuard) {
        this.authService = authService;
        this.userIdResolver = userIdResolver;
        this.refreshSessionService = refreshSessionService;
        this.refreshCookieService = refreshCookieService;
        this.csrfService = csrfService;
        this.browserRequestGuard = browserRequestGuard;
        this.securityEventService = securityEventService;
        this.abuseGuard = abuseGuard;
    }

    @GetMapping("/csrf")
    public ResponseEntity<AuthCsrfTokenResponse> csrf() {
        String token = csrfService.generateToken();
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, csrfService.issueCookie(token))
                .body(new AuthCsrfTokenResponse(token));
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            HttpServletRequest servletRequest,
            @Valid @RequestBody RegisterRequest request) {
        browserRequestGuard.validate(servletRequest);
        abuseGuard.check(AuthAbuseLimit.REGISTER);
        try {
            AuthResponse response = authService.register(request);
            ResponseEntity<AuthResponse> result = withRefreshCookie(response, HttpStatus.CREATED);
            securityEventService.recordRegisterSuccess(response.user().id());
            return result;
        } catch (UserAccountConflictException exception) {
            securityEventService.recordRegisterFailure(AuthSecurityEventReasonCode.DUPLICATE_ACCOUNT);
            throw exception;
        } catch (IllegalArgumentException exception) {
            securityEventService.recordRegisterFailure(AuthSecurityEventReasonCode.VALIDATION_FAILED);
            throw exception;
        } catch (RuntimeException exception) {
            securityEventService.recordRegisterFailure(AuthSecurityEventReasonCode.UNKNOWN);
            throw exception;
        }
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            HttpServletRequest servletRequest,
            @Valid @RequestBody LoginRequest request) {
        browserRequestGuard.validate(servletRequest);
        abuseGuard.check(AuthAbuseLimit.LOGIN);
        try {
            AuthResponse response = authService.login(request);
            ResponseEntity<AuthResponse> result = withRefreshCookie(response, HttpStatus.OK);
            securityEventService.recordLoginSuccess(response.user().id());
            return result;
        } catch (AuthenticationFailedException exception) {
            securityEventService.recordLoginFailure(AuthSecurityEventReasonCode.INVALID_CREDENTIALS);
            throw exception;
        } catch (IllegalArgumentException exception) {
            securityEventService.recordLoginFailure(AuthSecurityEventReasonCode.VALIDATION_FAILED);
            throw exception;
        } catch (RuntimeException exception) {
            securityEventService.recordLoginFailure(AuthSecurityEventReasonCode.UNKNOWN);
            throw exception;
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(HttpServletRequest request) {
        browserRequestGuard.validate(request);
        abuseGuard.check(AuthAbuseLimit.REFRESH);
        RefreshSessionService.IssuedRefreshToken refreshToken;
        try {
            refreshToken = refreshSessionService.rotate(refreshCookieService.readToken(request));
        } catch (AuthenticationFailedException exception) {
            securityEventService.recordRefreshFailure(AuthSecurityEventReasonCode.INVALID_REFRESH_SESSION);
            throw exception;
        } catch (RuntimeException exception) {
            securityEventService.recordRefreshFailure(AuthSecurityEventReasonCode.UNKNOWN);
            throw exception;
        }
        try {
            AuthResponse response = authService.refreshAccessToken(refreshToken.userId());
            ResponseEntity<AuthResponse> result = ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE, refreshCookieService.issueCookie(refreshToken.token()))
                    .body(response);
            securityEventService.recordRefreshSuccess(refreshToken.userId());
            return result;
        } catch (AuthenticationFailedException exception) {
            refreshSessionService.revokeIfPresent(refreshToken.token());
            securityEventService.recordRefreshFailure(AuthSecurityEventReasonCode.INACTIVE_OR_MISSING_USER);
            throw exception;
        } catch (RuntimeException exception) {
            securityEventService.recordRefreshFailure(AuthSecurityEventReasonCode.UNKNOWN);
            throw exception;
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        browserRequestGuard.validate(request);
        abuseGuard.check(AuthAbuseLimit.LOGOUT);
        securityEventService.recordLogoutRequested();
        refreshSessionService.revokeIfPresent(refreshCookieService.readToken(request));
        ResponseEntity<Void> result = ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, refreshCookieService.clearCookie())
                .build();
        securityEventService.recordLogoutCompleted(null);
        return result;
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
