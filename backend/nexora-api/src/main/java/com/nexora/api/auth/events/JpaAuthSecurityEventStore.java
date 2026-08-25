package com.nexora.api.auth.events;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;

@Component
@Profile("dev")
public class JpaAuthSecurityEventStore implements AuthSecurityEventStore {

    private final AuthSecurityEventRepository repository;

    public JpaAuthSecurityEventStore(AuthSecurityEventRepository repository) {
        this.repository = repository;
    }

    @Override
    public AuthSecurityEvent save(AuthSecurityEvent event) {
        return repository.saveAndFlush(event);
    }

    @Override
    public List<AuthSecurityEvent> findAll() {
        return List.copyOf(repository.findAllByOrderByOccurredAtAscIdAsc());
    }

    @Override
    @Transactional
    public int deleteOlderThan(LocalDateTime cutoff) {
        return repository.deleteByOccurredAtBefore(Objects.requireNonNull(cutoff));
    }
}
