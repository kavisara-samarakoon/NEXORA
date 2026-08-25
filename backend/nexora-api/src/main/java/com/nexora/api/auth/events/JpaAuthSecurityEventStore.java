package com.nexora.api.auth.events;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.List;

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
}
