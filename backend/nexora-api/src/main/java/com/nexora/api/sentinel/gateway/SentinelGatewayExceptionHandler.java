package com.nexora.api.sentinel.gateway;

import com.nexora.api.auth.AuthenticationFailedException;
import com.nexora.api.error.ApiErrorFactory;
import com.nexora.api.error.ApiErrorResponse;
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

@RestControllerAdvice(assignableTypes = SentinelGatewayController.class)
@Order(Ordered.HIGHEST_PRECEDENCE)
public class SentinelGatewayExceptionHandler {

    private final ApiErrorFactory errorFactory;

    public SentinelGatewayExceptionHandler(ApiErrorFactory errorFactory) {
        this.errorFactory = errorFactory;
    }

    @ExceptionHandler(SentinelRateLimitExceededException.class)
    public ResponseEntity<ApiErrorResponse> rateLimited(
            SentinelRateLimitExceededException exception,
            HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .header(HttpHeaders.RETRY_AFTER, Long.toString(exception.getRetryAfterSeconds()))
                .body(errorFactory.create(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "rate_limit_exceeded",
                        "Sentinel request limit reached. Please wait before trying again.",
                        request,
                        exception.getRetryAfterSeconds()));
    }

    @ExceptionHandler(AuthenticationFailedException.class)
    public ResponseEntity<ApiErrorResponse> unauthorized(
            AuthenticationFailedException exception,
            HttpServletRequest request) {
        return errorFactory.response(
                HttpStatus.UNAUTHORIZED,
                "authentication_required",
                "A valid Bearer token is required",
                request);
    }

    @ExceptionHandler({MethodArgumentNotValidException.class,
            HttpMessageNotReadableException.class,
            IllegalArgumentException.class})
    public ResponseEntity<ApiErrorResponse> invalidRequest(
            Exception exception,
            HttpServletRequest request) {
        return errorFactory.response(
                HttpStatus.BAD_REQUEST,
                "validation_failed",
                "The Sentinel gateway request could not be validated",
                request);
    }
}
