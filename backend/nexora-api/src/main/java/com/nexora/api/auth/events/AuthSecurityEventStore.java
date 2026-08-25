package com.nexora.api.auth.events;

import java.time.LocalDateTime;
import java.util.List;

public interface AuthSecurityEventStore {

    AuthSecurityEvent save(AuthSecurityEvent event);

    List<AuthSecurityEvent> findAll();

    int deleteOlderThan(LocalDateTime cutoff);
}
