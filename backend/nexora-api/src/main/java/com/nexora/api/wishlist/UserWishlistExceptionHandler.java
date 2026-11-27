package com.nexora.api.wishlist;

import com.nexora.api.auth.AuthenticationFailedException;
import com.nexora.api.error.ApiErrorFactory;
import com.nexora.api.error.ApiErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = UserWishlistController.class)
@Order(Ordered.HIGHEST_PRECEDENCE)
public class UserWishlistExceptionHandler {

    private final ApiErrorFactory errorFactory;

    public UserWishlistExceptionHandler(ApiErrorFactory errorFactory) {
        this.errorFactory = errorFactory;
    }

    @ExceptionHandler(WishlistItemNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> notFound(
            WishlistItemNotFoundException exception,
            HttpServletRequest request) {
        return errorFactory.response(
                HttpStatus.NOT_FOUND, "wishlist_item_not_found", exception.getMessage(), request);
    }

    @ExceptionHandler(AuthenticationFailedException.class)
    public ResponseEntity<ApiErrorResponse> unauthorized(
            AuthenticationFailedException exception,
            HttpServletRequest request) {
        return errorFactory.response(
                HttpStatus.UNAUTHORIZED, "authentication_required", exception.getMessage(), request);
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class})
    public ResponseEntity<ApiErrorResponse> invalidRequest(
            Exception exception,
            HttpServletRequest request) {
        String message = "Request validation failed";
        if (exception instanceof MethodArgumentNotValidException validationException
                && validationException.getBindingResult().getFieldError() != null) {
            message = validationException.getBindingResult().getFieldError().getField()
                    + ": " + validationException.getBindingResult().getFieldError().getDefaultMessage();
        }
        return errorFactory.response(
                HttpStatus.BAD_REQUEST, "validation_failed", message, request);
    }

    @ExceptionHandler({ConstraintViolationException.class, IllegalArgumentException.class})
    public ResponseEntity<ApiErrorResponse> invalidParameter(
            Exception exception,
            HttpServletRequest request) {
        String message = exception instanceof IllegalArgumentException
                && exception.getMessage() != null && !exception.getMessage().isBlank()
                ? exception.getMessage()
                : "Request validation failed";
        return errorFactory.response(
                HttpStatus.BAD_REQUEST,
                "validation_failed",
                message,
                request);
    }
}
