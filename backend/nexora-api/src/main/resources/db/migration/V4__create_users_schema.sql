CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(320) NOT NULL,
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(60) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uk_users_email UNIQUE (email),
    CONSTRAINT uk_users_username UNIQUE (username),
    CONSTRAINT ck_users_email_not_blank CHECK (BTRIM(email) <> ''),
    CONSTRAINT ck_users_username_not_blank CHECK (BTRIM(username) <> ''),
    CONSTRAINT ck_users_display_name_not_blank CHECK (BTRIM(display_name) <> ''),
    CONSTRAINT ck_users_password_hash_not_blank CHECK (BTRIM(password_hash) <> '')
);

CREATE UNIQUE INDEX ux_users_email_lower ON users (LOWER(email));
CREATE UNIQUE INDEX ux_users_username_lower ON users (LOWER(username));
