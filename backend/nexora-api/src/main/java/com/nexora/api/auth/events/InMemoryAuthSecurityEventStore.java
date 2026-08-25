package com.nexora.api.auth.events;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

@Component
@Profile("!dev")
public class InMemoryAuthSecurityEventStore implements AuthSecurityEventStore {

    static final int DEFAULT_MAX_EVENTS = 500;

    private final AtomicLong ids = new AtomicLong();
    private final Deque<AuthSecurityEvent> events = new ArrayDeque<>();
    private final int maxEvents;

    public InMemoryAuthSecurityEventStore() {
        this(DEFAULT_MAX_EVENTS);
    }

    InMemoryAuthSecurityEventStore(int maxEvents) {
        if (maxEvents <= 0) {
            throw new IllegalArgumentException("maxEvents must be positive");
        }
        this.maxEvents = maxEvents;
    }

    @Override
    public synchronized AuthSecurityEvent save(AuthSecurityEvent event) {
        event.assignId(ids.incrementAndGet());
        events.addLast(event);
        while (events.size() > maxEvents) {
            events.removeFirst();
        }
        return event;
    }

    @Override
    public synchronized List<AuthSecurityEvent> findAll() {
        return List.copyOf(new ArrayList<>(events));
    }
}
