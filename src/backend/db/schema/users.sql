CREATE TABLE Users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    session_version INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT chk_users_session_version CHECK (session_version >= 0)
);

CREATE UNIQUE INDEX uniq_users_single_admin ON Users(is_admin) WHERE is_admin;
