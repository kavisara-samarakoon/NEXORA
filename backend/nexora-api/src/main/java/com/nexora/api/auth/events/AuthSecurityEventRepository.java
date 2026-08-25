package com.nexora.api.auth.events;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface AuthSecurityEventRepository extends JpaRepository<AuthSecurityEvent, Long> {

    List<AuthSecurityEvent> findAllByOrderByOccurredAtAscIdAsc();

    int deleteByOccurredAtBefore(LocalDateTime cutoff);
}
