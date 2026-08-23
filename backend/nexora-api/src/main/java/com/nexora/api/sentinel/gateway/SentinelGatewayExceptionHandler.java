package com.nexora.api.sentinel.gateway;

import com.nexora.api.auth.AuthenticationFailedException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = SentinelGatewayController.class)
public class SentinelGatewayExceptionHandler {

    @ExceptionHandler(AuthenticationFailedException.class)
    public ResponseEntity<SentinelGatewayErrorResponse> unauthorized(
            AuthenticationFailedException exception) {
        return error(
                HttpStatus.UNAUTHORIZED,
                "authentication_required",
                "A valid Bearer token is required");
    }

    @ExceptionHandler({MethodArgumentNotValidException.class,
            HttpMessageNotReadableException.class,
            IllegalArgumentException.class})
    public ResponseEntity<SentinelGatewayErrorResponse> invalidRequest(Exception exception) {
        return error(
                HttpStatus.BAD_REQUEST,
                "validation_failed",
                "The Sentinel gateway request could not be validated");
    }

    private static ResponseEntity<SentinelGatewayErrorResponse> error(
            HttpStatus status,
            String code,
            String message) {
        return ResponseEntity.status(status)
                .body(new SentinelGatewayErrorResponse(code, message));
    }
}
