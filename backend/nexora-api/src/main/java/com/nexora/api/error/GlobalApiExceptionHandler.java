package com.nexora.api.error;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestControllerAdvice(basePackages = "com.nexora.api")
@Order(Ordered.LOWEST_PRECEDENCE)
public class GlobalApiExceptionHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(GlobalApiExceptionHandler.class);

    private final ApiErrorFactory errorFactory;

    public GlobalApiExceptionHandler(ApiErrorFactory errorFactory) {
        this.errorFactory = errorFactory;
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiErrorResponse> invalidParameter(
            ConstraintViolationException exception,
            HttpServletRequest request) {
        ConstraintViolation<?> violation = exception.getConstraintViolations().stream()
                .findFirst()
                .orElse(null);
        String message = violation == null
                ? "Request validation failed"
                : parameterName(violation.getPropertyPath().toString())
                        + ": " + violation.getMessage();

        return errorFactory.response(
                HttpStatus.BAD_REQUEST,
                "validation_failed",
                message,
                request);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiErrorResponse> invalidParameterType(
            MethodArgumentTypeMismatchException exception,
            HttpServletRequest request) {
        Class<?> requiredType = exception.getRequiredType();
        String expectedType = requiredType != null && Number.class.isAssignableFrom(requiredType)
                ? "number"
                : "value";

        return errorFactory.response(
                HttpStatus.BAD_REQUEST,
                "validation_failed",
                exception.getName() + ": must be a valid " + expectedType,
                request);
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

    private static String parameterName(String propertyPath) {
        int separator = propertyPath.lastIndexOf('.');
        return separator >= 0 ? propertyPath.substring(separator + 1) : propertyPath;
    }
}
