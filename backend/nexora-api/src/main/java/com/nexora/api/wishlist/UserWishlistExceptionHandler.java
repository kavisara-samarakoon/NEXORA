package com.nexora.api.wishlist;

import com.nexora.api.auth.AuthenticationFailedException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = UserWishlistController.class)
public class UserWishlistExceptionHandler {

    @ExceptionHandler(WishlistItemNotFoundException.class)
    public ResponseEntity<WishlistErrorResponse> notFound(WishlistItemNotFoundException exception) {
        return error(HttpStatus.NOT_FOUND, "wishlist_item_not_found", exception.getMessage());
    }

    @ExceptionHandler(AuthenticationFailedException.class)
    public ResponseEntity<WishlistErrorResponse> unauthorized(AuthenticationFailedException exception) {
        return error(HttpStatus.UNAUTHORIZED, "authentication_required", exception.getMessage());
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class})
    public ResponseEntity<WishlistErrorResponse> invalidRequest(Exception exception) {
        String message = "Request validation failed";
        if (exception instanceof MethodArgumentNotValidException validationException
                && validationException.getBindingResult().getFieldError() != null) {
            message = validationException.getBindingResult().getFieldError().getField()
                    + ": " + validationException.getBindingResult().getFieldError().getDefaultMessage();
        }
        return error(HttpStatus.BAD_REQUEST, "validation_failed", message);
    }

    private static ResponseEntity<WishlistErrorResponse> error(
            HttpStatus status, String code, String message) {
        return ResponseEntity.status(status).body(new WishlistErrorResponse(code, message));
    }
}
