package com.nexora.api.notifications.preferences;

import com.nexora.api.auth.AuthenticationFailedException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = UserNotificationPreferenceController.class)
public class NotificationPreferenceExceptionHandler {

    @ExceptionHandler(AuthenticationFailedException.class)
    public ResponseEntity<NotificationPreferenceErrorResponse> unauthorized(
            AuthenticationFailedException exception) {
        return error(
                HttpStatus.UNAUTHORIZED,
                "authentication_required",
                exception.getMessage());
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class})
    public ResponseEntity<NotificationPreferenceErrorResponse> invalidRequest(
            Exception exception) {
        return error(
                HttpStatus.BAD_REQUEST,
                "validation_failed",
                "Notification preference validation failed");
    }

    private static ResponseEntity<NotificationPreferenceErrorResponse> error(
            HttpStatus status,
            String code,
            String message) {
        return ResponseEntity.status(status)
                .body(new NotificationPreferenceErrorResponse(code, message));
    }
}
