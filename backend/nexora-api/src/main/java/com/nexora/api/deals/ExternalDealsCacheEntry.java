package com.nexora.api.deals;

import java.time.Instant;

public record ExternalDealsCacheEntry<T>(T value, Instant fetchedAt, Instant expiresAt) {

    public ExternalDealsCacheEntry(T value, Instant expiresAt) {
        this(value, null, expiresAt);
    }

    public boolean isFresh(Instant now) {
        return now.isBefore(expiresAt);
    }
}
