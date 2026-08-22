package com.nexora.api.auth.session;

import com.nexora.api.auth.AuthenticationFailedException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Service
public class RefreshSessionService {

    private static final String INVALID_REFRESH_SESSION = "Refresh session is invalid or expired";

    private final RefreshSessionStore store;
    private final RefreshTokenCodec tokenCodec;
    private final RefreshSessionProperties properties;
    private final Clock clock;

    @Autowired
    public RefreshSessionService(
            RefreshSessionStore store,
            RefreshTokenCodec tokenCodec,
            RefreshSessionProperties properties) {
        this(store, tokenCodec, properties, Clock.systemUTC());
    }

    RefreshSessionService(
            RefreshSessionStore store,
            RefreshTokenCodec tokenCodec,
            RefreshSessionProperties properties,
            Clock clock) {
        this.store = store;
        this.tokenCodec = tokenCodec;
        this.properties = properties;
        this.clock = clock;
    }

    public IssuedRefreshToken issue(long userId) {
        LocalDateTime issuedAt = now();
        String rawToken = tokenCodec.generateToken();
        store.save(new RefreshSession(
                userId,
                tokenCodec.hash(rawToken),
                issuedAt,
                issuedAt.plus(properties.expiration()),
                null));
        return new IssuedRefreshToken(rawToken, userId);
    }

    public IssuedRefreshToken rotate(String rawToken) {
        requireWellFormed(rawToken);
        LocalDateTime issuedAt = now();
        String successorToken = tokenCodec.generateToken();
        RefreshSession successor = store.rotate(
                        tokenCodec.hash(rawToken),
                        tokenCodec.hash(successorToken),
                        issuedAt,
                        issuedAt.plus(properties.expiration()))
                .orElseThrow(RefreshSessionService::invalidRefreshSession);
        return new IssuedRefreshToken(successorToken, successor.getUserId());
    }

    public void revokeIfPresent(String rawToken) {
        if (!tokenCodec.isWellFormed(rawToken)) {
            return;
        }
        store.revoke(tokenCodec.hash(rawToken), now());
    }

    private LocalDateTime now() {
        return LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC);
    }

    private void requireWellFormed(String rawToken) {
        if (!tokenCodec.isWellFormed(rawToken)) {
            throw invalidRefreshSession();
        }
    }

    private static AuthenticationFailedException invalidRefreshSession() {
        return new AuthenticationFailedException(INVALID_REFRESH_SESSION);
    }

    public record IssuedRefreshToken(String token, long userId) {
    }
}
