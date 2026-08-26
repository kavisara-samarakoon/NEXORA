package com.nexora.api.error;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.Instant;

@Component
public class ApiErrorFactory {

    private final Clock clock;

    public ApiErrorFactory() {
        this(Clock.systemUTC());
    }

    ApiErrorFactory(Clock clock) {
        this.clock = clock;
    }

    public ResponseEntity<ApiErrorResponse> response(
            HttpStatus status,
            String error,
            String message,
            HttpServletRequest request) {
        return ResponseEntity.status(status)
                .body(create(status, error, message, request));
    }

    public ApiErrorResponse create(
            HttpStatus status,
            String error,
            String message,
            HttpServletRequest request) {
        return create(status, error, message, request, null);
    }

    public ApiErrorResponse create(
            HttpStatus status,
            String error,
            String message,
            HttpServletRequest request,
            Long retryAfterSeconds) {
        return new ApiErrorResponse(
                error,
                message,
                status.value(),
                request.getRequestURI(),
                Instant.now(clock),
                retryAfterSeconds);
    }
}
