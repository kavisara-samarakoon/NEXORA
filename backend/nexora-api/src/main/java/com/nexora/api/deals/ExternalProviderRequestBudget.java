package com.nexora.api.deals;

import org.springframework.stereotype.Component;

import java.util.Objects;
import java.util.concurrent.Semaphore;
import java.util.function.Supplier;

@Component
public final class ExternalProviderRequestBudget {

    static final int MAX_CONCURRENT_PROVIDER_CALLS = 4;

    private final Semaphore permits;

    public ExternalProviderRequestBudget() {
        this(MAX_CONCURRENT_PROVIDER_CALLS);
    }

    ExternalProviderRequestBudget(int maxConcurrentProviderCalls) {
        if (maxConcurrentProviderCalls < 1) {
            throw new IllegalArgumentException("Provider request budget must be at least one");
        }
        permits = new Semaphore(maxConcurrentProviderCalls);
    }

    <T> T execute(Supplier<T> providerCall) {
        Objects.requireNonNull(providerCall, "providerCall");
        if (!permits.tryAcquire()) {
            throw new CapacityUnavailableException();
        }

        try {
            return providerCall.get();
        } finally {
            permits.release();
        }
    }

    static final class CapacityUnavailableException extends RuntimeException {

        private CapacityUnavailableException() {
            super("External provider request budget is saturated");
        }
    }
}
