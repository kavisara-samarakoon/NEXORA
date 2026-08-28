package com.nexora.api.error;

import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(basePackages = "com.nexora.api")
@Order(Ordered.LOWEST_PRECEDENCE)
public class GlobalApiExceptionHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(GlobalApiExceptionHandler.class);

    private final ApiErrorFactory errorFactory;

    public GlobalApiExceptionHandler(ApiErrorFactory errorFactory) {
        this.errorFactory = errorFactory;
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> unexpected(
            Exception exception,
            HttpServletRequest request) {
        LOGGER.error(
                "Unexpected API error handled method={} path={} status={}",
                request.getMethod(),
                request.getRequestURI(),
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                exception);

        return errorFactory.response(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "internal_error",
                "An unexpected API error occurred",
                request);
    }
}
