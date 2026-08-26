package com.nexora.api.auth;

import com.nexora.api.auth.abuse.AuthRateLimitExceededException;
import com.nexora.api.auth.csrf.AuthRequestProtectionException;
import com.nexora.api.auth.events.AuthSecurityEventReasonCode;
import com.nexora.api.auth.events.AuthSecurityEventService;
import com.nexora.api.error.ApiErrorFactory;
import com.nexora.api.error.ApiErrorResponse;
import com.nexora.api.users.UserAccountConflictException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = AuthController.class)
@Order(Ordered.HIGHEST_PRECEDENCE)
public class AuthExceptionHandler {

    private final AuthSecurityEventService securityEventService;
    private final ApiErrorFactory errorFactory;

    public AuthExceptionHandler(
            AuthSecurityEventService securityEventService,
            ApiErrorFactory errorFactory) {
        this.securityEventService = securityEventService;
        this.errorFactory = errorFactory;
    }

    @ExceptionHandler(AuthRequestProtectionException.class)
    public ResponseEntity<ApiErrorResponse> csrfFailed(
            AuthRequestProtectionException exception,
            HttpServletRequest request) {
        return errorFactory.response(
                HttpStatus.FORBIDDEN, "csrf_failed", exception.getMessage(), request);
    }

    @ExceptionHandler(AuthRateLimitExceededException.class)
    public ResponseEntity<ApiErrorResponse> rateLimited(
            AuthRateLimitExceededException exception,
            HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(HttpHeaders.RETRY_AFTER, Long.toString(exception.retryAfterSeconds()))
                .body(errorFactory.create(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "rate_limited",
                        exception.getMessage(),
                        request,
                        exception.retryAfterSeconds()));
    }

    @ExceptionHandler(UserAccountConflictException.class)
    public ResponseEntity<ApiErrorResponse> conflict(
            UserAccountConflictException exception,
            HttpServletRequest request) {
        return errorFactory.response(
                HttpStatus.CONFLICT, "account_conflict", exception.getMessage(), request);
    }

    @ExceptionHandler(AuthenticationFailedException.class)
    public ResponseEntity<ApiErrorResponse> unauthorized(
            AuthenticationFailedException exception,
            HttpServletRequest request) {
        return errorFactory.response(
                HttpStatus.UNAUTHORIZED, "authentication_failed", exception.getMessage(), request);
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class})
    public ResponseEntity<ApiErrorResponse> invalidRequest(
            Exception exception,
            HttpServletRequest request) {
        recordValidationFailure(request);
        String message = "Request validation failed";
        if (exception instanceof MethodArgumentNotValidException validationException
                && validationException.getBindingResult().getFieldError() != null) {
            message = validationException.getBindingResult().getFieldError().getField()
                    + ": " + validationException.getBindingResult().getFieldError().getDefaultMessage();
        }
        return errorFactory.response(
                HttpStatus.BAD_REQUEST, "validation_failed", message, request);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiErrorResponse> invalidArgument(
            IllegalArgumentException exception,
            HttpServletRequest request) {
        return errorFactory.response(
                HttpStatus.BAD_REQUEST, "validation_failed", exception.getMessage(), request);
    }

    private void recordValidationFailure(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (path.endsWith("/api/auth/register")) {
            securityEventService.recordRegisterFailure(AuthSecurityEventReasonCode.VALIDATION_FAILED);
        } else if (path.endsWith("/api/auth/login")) {
            securityEventService.recordLoginFailure(AuthSecurityEventReasonCode.VALIDATION_FAILED);
        }
    }
}
