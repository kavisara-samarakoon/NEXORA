package com.nexora.api.auth.session;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "auth_sessions",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_auth_sessions_token_hash",
                columnNames = "token_hash"))
public class RefreshSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "token_hash", nullable = false, length = 128)
    private String tokenHash;

    @Column(name = "issued_at", nullable = false, updatable = false)
    private LocalDateTime issuedAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    @Column(name = "rotated_from_id")
    private Long rotatedFromId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected RefreshSession() {
    }

    public RefreshSession(
            long userId,
            String tokenHash,
            LocalDateTime issuedAt,
            LocalDateTime expiresAt,
            Long rotatedFromId) {
        this.userId = userId;
        this.tokenHash = tokenHash;
        this.issuedAt = issuedAt;
        this.expiresAt = expiresAt;
        this.rotatedFromId = rotatedFromId;
        this.createdAt = issuedAt;
        this.updatedAt = issuedAt;
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public String getTokenHash() {
        return tokenHash;
    }

    public LocalDateTime getIssuedAt() {
        return issuedAt;
    }

    public LocalDateTime getExpiresAt() {
        return expiresAt;
    }

    public LocalDateTime getRevokedAt() {
        return revokedAt;
    }

    public Long getRotatedFromId() {
        return rotatedFromId;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public boolean isActiveAt(LocalDateTime time) {
        return revokedAt == null && expiresAt.isAfter(time);
    }

    void revoke(LocalDateTime time) {
        if (revokedAt == null) {
            revokedAt = time;
            updatedAt = time;
        }
    }

    void assignId(long value) {
        if (id == null) {
            id = value;
        }
    }
}
