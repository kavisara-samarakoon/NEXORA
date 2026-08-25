package com.nexora.api.auth;

import com.nexora.api.auth.abuse.AuthRateLimitExceededException;
import com.nexora.api.auth.csrf.AuthRequestProtectionException;
import com.nexora.api.auth.events.AuthSecurityEventReasonCode;
import com.nexora.api.auth.events.AuthSecurityEventService;
import com.nexora.api.users.UserAccountConflictException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.converter.HttpMessageNotReadableException;

@RestControllerAdvice(assignableTypes = AuthController.class)
public class AuthExceptionHandler {

    private final AuthSecurityEventService securityEventService;

    public AuthExceptionHandler(AuthSecurityEventService securityEventService) {
        this.securityEventService = securityEventService;
    }

    @ExceptionHandler(AuthRequestProtectionException.class)
    public ResponseEntity<AuthErrorResponse> csrfFailed(AuthRequestProtectionException exception) {
        return error(HttpStatus.FORBIDDEN, "csrf_failed", exception.getMessage());
    }

    @ExceptionHandler(AuthRateLimitExceededException.class)
    public ResponseEntity<AuthRateLimitErrorResponse> rateLimited(
            AuthRateLimitExceededException exception) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(HttpHeaders.RETRY_AFTER, Long.toString(exception.retryAfterSeconds()))
                .body(new AuthRateLimitErrorResponse(
                        "rate_limited",
                        exception.getMessage(),
                        exception.retryAfterSeconds()));
    }

    @ExceptionHandler(UserAccountConflictException.class)
    public ResponseEntity<AuthErrorResponse> conflict(UserAccountConflictException exception) {
        return error(HttpStatus.CONFLICT, "account_conflict", exception.getMessage());
    }

    @ExceptionHandler(AuthenticationFailedException.class)
    public ResponseEntity<AuthErrorResponse> unauthorized(AuthenticationFailedException exception) {
        return error(HttpStatus.UNAUTHORIZED, "authentication_failed", exception.getMessage());
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class})
    public ResponseEntity<AuthErrorResponse> invalidRequest(
            Exception exception,
            HttpServletRequest request) {
        recordValidationFailure(request);
        String message = "Request validation failed";
        if (exception instanceof MethodArgumentNotValidException validationException
                && validationException.getBindingResult().getFieldError() != null) {
            message = validationException.getBindingResult().getFieldError().getField()
                    + ": " + validationException.getBindingResult().getFieldError().getDefaultMessage();
        }
        return error(HttpStatus.BAD_REQUEST, "validation_failed", message);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<AuthErrorResponse> invalidArgument(IllegalArgumentException exception) {
        return error(HttpStatus.BAD_REQUEST, "validation_failed", exception.getMessage());
    }

    private void recordValidationFailure(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (path.endsWith("/api/auth/register")) {
            securityEventService.recordRegisterFailure(AuthSecurityEventReasonCode.VALIDATION_FAILED);
        } else if (path.endsWith("/api/auth/login")) {
            securityEventService.recordLoginFailure(AuthSecurityEventReasonCode.VALIDATION_FAILED);
        }
    }

    private static ResponseEntity<AuthErrorResponse> error(HttpStatus status, String code, String message) {
        return ResponseEntity.status(status).body(new AuthErrorResponse(code, message));
    }
}
