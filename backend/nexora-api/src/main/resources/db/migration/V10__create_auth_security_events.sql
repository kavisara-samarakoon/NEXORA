CREATE TABLE auth_security_events (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(64) NOT NULL,
    outcome VARCHAR(32) NOT NULL,
    user_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    reason_code VARCHAR(80) NULL,
    source VARCHAR(64) NOT NULL DEFAULT 'auth',
    occurred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_auth_security_events_type_not_blank CHECK (BTRIM(event_type) <> ''),
    CONSTRAINT ck_auth_security_events_outcome CHECK (outcome IN ('SUCCESS', 'FAILURE', 'REJECTED')),
    CONSTRAINT ck_auth_security_events_reason_not_blank CHECK (
        reason_code IS NULL OR BTRIM(reason_code) <> ''
    ),
    CONSTRAINT ck_auth_security_events_source_not_blank CHECK (BTRIM(source) <> '')
);

CREATE INDEX ix_auth_security_events_occurred_at
    ON auth_security_events (occurred_at);
CREATE INDEX ix_auth_security_events_user_id
    ON auth_security_events (user_id);
CREATE INDEX ix_auth_security_events_type_occurred_at
    ON auth_security_events (event_type, occurred_at);
CREATE INDEX ix_auth_security_events_outcome
    ON auth_security_events (outcome);
