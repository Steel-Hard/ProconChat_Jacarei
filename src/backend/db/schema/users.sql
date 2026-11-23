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
    permissions_updated_by BIGINT REFERENCES Users(id),
    permissions_updated_at TIMESTAMPTZ,
    CONSTRAINT chk_users_session_version CHECK (session_version >= 0),
    CONSTRAINT chk_users_permissions_updated CHECK ((permissions_updated_by IS NULL) = (permissions_updated_at IS NULL))
);

CREATE UNIQUE INDEX uniq_users_single_admin ON Users(is_admin) WHERE is_admin;
CREATE UNIQUE INDEX uniq_users_email_lower ON Users (lower(email));
