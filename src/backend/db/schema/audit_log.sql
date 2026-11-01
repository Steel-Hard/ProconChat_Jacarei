CREATE TABLE AuditLog (
    id BIGSERIAL PRIMARY KEY,
    area VARCHAR(40) NOT NULL,
    action VARCHAR(80) NOT NULL,
    actor_user_id BIGINT REFERENCES Users(id),
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_audit_log_data_object CHECK (jsonb_typeof(data) = 'object')
);

CREATE INDEX idx_audit_log_area ON AuditLog(area, created_at DESC, id DESC);
