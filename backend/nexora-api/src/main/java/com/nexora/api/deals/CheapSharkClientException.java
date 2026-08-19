package com.nexora.api.deals;

class CheapSharkClientException extends RuntimeException {

    CheapSharkClientException(String message) {
        super(message);
    }

    CheapSharkClientException(String message, Throwable cause) {
        super(message, cause);
    }
}
