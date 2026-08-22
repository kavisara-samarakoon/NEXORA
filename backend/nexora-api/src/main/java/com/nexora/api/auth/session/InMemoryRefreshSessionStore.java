package com.nexora.api.auth.session;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

@Component
@Profile("!dev")
public class InMemoryRefreshSessionStore implements RefreshSessionStore {

    private final AtomicLong ids = new AtomicLong();
    private final Map<String, RefreshSession> sessionsByHash = new ConcurrentHashMap<>();

    @Override
    public synchronized RefreshSession save(RefreshSession session) {
        if (sessionsByHash.containsKey(session.getTokenHash())) {
            throw new IllegalStateException("Refresh token hash already exists");
        }
        session.assignId(ids.incrementAndGet());
        sessionsByHash.put(session.getTokenHash(), session);
        return session;
    }

    @Override
    public synchronized Optional<RefreshSession> rotate(
            String currentTokenHash,
            String successorTokenHash,
            LocalDateTime issuedAt,
            LocalDateTime expiresAt) {
        RefreshSession current = sessionsByHash.get(currentTokenHash);
        if (current == null || !current.isActiveAt(issuedAt)) {
            return Optional.empty();
        }
        if (sessionsByHash.containsKey(successorTokenHash)) {
            throw new IllegalStateException("Refresh token hash already exists");
        }

        current.revoke(issuedAt);
        RefreshSession successor = new RefreshSession(
                current.getUserId(), successorTokenHash, issuedAt, expiresAt, current.getId());
        return Optional.of(save(successor));
    }

    @Override
    public synchronized void revoke(String tokenHash, LocalDateTime revokedAt) {
        RefreshSession session = sessionsByHash.get(tokenHash);
        if (session != null) {
            session.revoke(revokedAt);
        }
    }
}
