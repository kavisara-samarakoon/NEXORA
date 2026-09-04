package com.nexora.api.config;

import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;

final class ProductionProfilePersistenceGuard {

    private static final String FAILURE_MESSAGE =
            "Production-like profiles require persistent storage and must not run with "
                    + "in-memory demo persistence. Activate the existing dev database-backed "
                    + "profile together with prod or production.";

    private ProductionProfilePersistenceGuard() {
    }

    static void validate(Environment environment) {
        if (environment == null) {
            return;
        }

        boolean productionLike = environment.acceptsProfiles(Profiles.of("prod", "production"));
        boolean persistent = environment.acceptsProfiles(Profiles.of("dev"));
        if (productionLike && !persistent) {
            throw new IllegalStateException(FAILURE_MESSAGE);
        }
    }
}
