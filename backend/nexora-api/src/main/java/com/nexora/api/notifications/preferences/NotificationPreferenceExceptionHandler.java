package com.nexora.api.notifications.preferences;

import com.nexora.api.auth.AuthenticationFailedException;
import com.nexora.api.error.ApiErrorFactory;
import com.nexora.api.error.ApiErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = UserNotificationPreferenceController.class)
@Order(Ordered.HIGHEST_PRECEDENCE)
public class NotificationPreferenceExceptionHandler {

    private final ApiErrorFactory errorFactory;

    public NotificationPreferenceExceptionHandler(ApiErrorFactory errorFactory) {
        this.errorFactory = errorFactory;
    }

    @ExceptionHandler(AuthenticationFailedException.class)
    public ResponseEntity<ApiErrorResponse> unauthorized(
            AuthenticationFailedException exception,
            HttpServletRequest request) {
        return errorFactory.response(
                HttpStatus.UNAUTHORIZED,
                "authentication_required",
                exception.getMessage(),
                request);
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class})
    public ResponseEntity<ApiErrorResponse> invalidRequest(
            Exception exception,
            HttpServletRequest request) {
        return errorFactory.response(
                HttpStatus.BAD_REQUEST,
                "validation_failed",
                "Notification preference validation failed",
                request);
    }
}
