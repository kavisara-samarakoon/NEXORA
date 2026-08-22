package com.nexora.api.auth.session;

import java.time.LocalDateTime;
import java.util.Optional;

public interface RefreshSessionStore {

    RefreshSession save(RefreshSession session);

    Optional<RefreshSession> rotate(
            String currentTokenHash,
            String successorTokenHash,
            LocalDateTime issuedAt,
            LocalDateTime expiresAt);

    void revoke(String tokenHash, LocalDateTime revokedAt);
}
