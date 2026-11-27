package com.nexora.api.giveaways;

public class GamerPowerClientException extends RuntimeException {

    public GamerPowerClientException(String message) {
        super(message);
    }

    public GamerPowerClientException(String message, Throwable cause) {
        super(message, cause);
    }
}
