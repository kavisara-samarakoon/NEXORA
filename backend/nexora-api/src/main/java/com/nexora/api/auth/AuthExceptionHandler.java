package com.nexora.api.auth;

import com.nexora.api.auth.csrf.AuthRequestProtectionException;
import com.nexora.api.users.UserAccountConflictException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.converter.HttpMessageNotReadableException;

@RestControllerAdvice(assignableTypes = AuthController.class)
public class AuthExceptionHandler {

    @ExceptionHandler(AuthRequestProtectionException.class)
    public ResponseEntity<AuthErrorResponse> csrfFailed(AuthRequestProtectionException exception) {
        return error(HttpStatus.FORBIDDEN, "csrf_failed", exception.getMessage());
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
    public ResponseEntity<AuthErrorResponse> invalidRequest(Exception exception) {
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

    private static ResponseEntity<AuthErrorResponse> error(HttpStatus status, String code, String message) {
        return ResponseEntity.status(status).body(new AuthErrorResponse(code, message));
    }
}
