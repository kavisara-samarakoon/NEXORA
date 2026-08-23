package com.nexora.api.sentinel.gateway;

class GeminiClientException extends RuntimeException {

    GeminiClientException(String message) {
        super(message);
    }

    GeminiClientException(String message, Throwable cause) {
        super(message, cause);
    }
}
