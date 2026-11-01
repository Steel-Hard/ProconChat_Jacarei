-- Up Migration
CREATE TYPE outbound_kind AS ENUM ('REPLY', 'CONFIRMATION', 'PAUSED', 'CANCELLATION', 'REMINDER');
CREATE TYPE outbound_status AS ENUM ('SENT', 'DELIVERED', 'READ', 'FAILED');

CREATE TABLE OutboundMessages (
    id BIGSERIAL PRIMARY KEY,
    provider_message_hash CHAR(64) UNIQUE,
    kind outbound_kind NOT NULL,
    session_id BIGINT REFERENCES Sessions(id),
    appointment_id BIGINT REFERENCES Appointments(id),
    status outbound_status NOT NULL DEFAULT 'SENT',
    error_code VARCHAR(40),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status_at TIMESTAMPTZ,
    CONSTRAINT chk_outbound_messages_provider_message_hash CHECK (provider_message_hash ~ '^[0-9a-f]{64}$')
);

CREATE INDEX idx_outbound_messages_failed ON OutboundMessages(status, status_at) WHERE status = 'FAILED';
CREATE INDEX idx_outbound_messages_appointment ON OutboundMessages(appointment_id);
CREATE INDEX idx_outbound_messages_session ON OutboundMessages(session_id);

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

-- Down Migration
DROP TABLE AuditLog;
DROP TABLE OutboundMessages;
DROP TYPE outbound_status;
DROP TYPE outbound_kind;
