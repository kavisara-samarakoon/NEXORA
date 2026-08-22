package com.nexora.api.auth.session;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Component
@Profile("dev")
public class JpaRefreshSessionStore implements RefreshSessionStore {

    private final RefreshSessionRepository repository;

    public JpaRefreshSessionStore(RefreshSessionRepository repository) {
        this.repository = repository;
    }

    @Override
    public RefreshSession save(RefreshSession session) {
        return repository.saveAndFlush(session);
    }

    @Override
    @Transactional
    public Optional<RefreshSession> rotate(
            String currentTokenHash,
            String successorTokenHash,
            LocalDateTime issuedAt,
            LocalDateTime expiresAt) {
        Optional<RefreshSession> currentResult = repository.findByTokenHashForUpdate(currentTokenHash);
        if (currentResult.isEmpty() || !currentResult.get().isActiveAt(issuedAt)) {
            return Optional.empty();
        }

        RefreshSession current = currentResult.get();
        current.revoke(issuedAt);
        RefreshSession successor = new RefreshSession(
                current.getUserId(), successorTokenHash, issuedAt, expiresAt, current.getId());
        return Optional.of(repository.saveAndFlush(successor));
    }

    @Override
    @Transactional
    public void revoke(String tokenHash, LocalDateTime revokedAt) {
        repository.findByTokenHashForUpdate(tokenHash)
                .ifPresent(session -> session.revoke(revokedAt));
    }
}
