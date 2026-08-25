package com.nexora.api.auth.events;

import java.util.List;

public interface AuthSecurityEventStore {

    AuthSecurityEvent save(AuthSecurityEvent event);

    List<AuthSecurityEvent> findAll();
}
