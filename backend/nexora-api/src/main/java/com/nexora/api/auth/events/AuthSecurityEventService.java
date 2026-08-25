package com.nexora.api.auth.events;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Service
public class AuthSecurityEventService {

    private static final Logger LOGGER = LoggerFactory.getLogger(AuthSecurityEventService.class);

    private final AuthSecurityEventStore store;
    private final Clock clock;

    @Autowired
    public AuthSecurityEventService(AuthSecurityEventStore store) {
        this(store, Clock.systemUTC());
    }

    AuthSecurityEventService(AuthSecurityEventStore store, Clock clock) {
        this.store = store;
        this.clock = clock;
    }

    public void recordRegisterSuccess(long userId) {
        record(AuthSecurityEventType.REGISTER_SUCCESS, AuthSecurityEventOutcome.SUCCESS, userId, null);
    }

    public void recordRegisterFailure(AuthSecurityEventReasonCode reasonCode) {
        record(AuthSecurityEventType.REGISTER_FAILURE, AuthSecurityEventOutcome.FAILURE, null, reasonCode);
    }

    public void recordLoginSuccess(long userId) {
        record(AuthSecurityEventType.LOGIN_SUCCESS, AuthSecurityEventOutcome.SUCCESS, userId, null);
    }

    public void recordLoginFailure(AuthSecurityEventReasonCode reasonCode) {
        record(AuthSecurityEventType.LOGIN_FAILURE, AuthSecurityEventOutcome.FAILURE, null, reasonCode);
    }

    public void recordRefreshSuccess(long userId) {
        record(AuthSecurityEventType.REFRESH_SUCCESS, AuthSecurityEventOutcome.SUCCESS, userId, null);
    }

    public void recordRefreshFailure(AuthSecurityEventReasonCode reasonCode) {
        record(AuthSecurityEventType.REFRESH_FAILURE, AuthSecurityEventOutcome.FAILURE, null, reasonCode);
    }

    public void recordLogoutRequested() {
        record(
                AuthSecurityEventType.LOGOUT_REQUESTED,
                AuthSecurityEventOutcome.SUCCESS,
                null,
                AuthSecurityEventReasonCode.LOGOUT_REQUESTED);
    }

    public void recordLogoutCompleted(Long userId) {
        record(
                AuthSecurityEventType.LOGOUT_COMPLETED,
                AuthSecurityEventOutcome.SUCCESS,
                userId,
                AuthSecurityEventReasonCode.LOGOUT_COMPLETED);
    }

    public void recordCsrfOriginFailure(AuthSecurityEventReasonCode reasonCode) {
        record(
                AuthSecurityEventType.CSRF_ORIGIN_FAILURE,
                AuthSecurityEventOutcome.REJECTED,
                null,
                reasonCode);
    }

    private void record(
            AuthSecurityEventType eventType,
            AuthSecurityEventOutcome outcome,
            Long userId,
            AuthSecurityEventReasonCode reasonCode) {
        try {
            store.save(AuthSecurityEvent.recorded(
                    eventType,
                    outcome,
                    userId,
                    reasonCode,
                    LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC)));
        } catch (RuntimeException exception) {
            LOGGER.warn(
                    "Auth security event recording failed for type={} outcome={}",
                    eventType,
                    outcome);
        }
    }
}
