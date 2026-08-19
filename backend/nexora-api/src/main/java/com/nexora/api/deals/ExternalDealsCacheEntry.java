package com.nexora.api.deals;

import java.time.Instant;

record ExternalDealsCacheEntry<T>(T value, Instant expiresAt) {

    boolean isFresh(Instant now) {
        return now.isBefore(expiresAt);
    }
}
