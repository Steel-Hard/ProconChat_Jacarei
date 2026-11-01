CREATE TYPE outbound_kind AS ENUM ('REPLY', 'CONFIRMATION', 'PAUSED', 'CANCELLATION', 'REMINDER');
CREATE TYPE outbound_status AS ENUM ('SENT', 'DELIVERED', 'READ', 'FAILED');

CREATE TABLE OutboundMessages (
    id BIGSERIAL PRIMARY KEY,
    provider_message_id VARCHAR(128) UNIQUE,
    kind outbound_kind NOT NULL,
    session_id BIGINT REFERENCES Sessions(id),
    appointment_id BIGINT REFERENCES Appointments(id),
    status outbound_status NOT NULL DEFAULT 'SENT',
    error_code VARCHAR(40),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status_at TIMESTAMPTZ
);

CREATE INDEX idx_outbound_messages_failed ON OutboundMessages(status, status_at) WHERE status = 'FAILED';
CREATE INDEX idx_outbound_messages_appointment ON OutboundMessages(appointment_id);
CREATE INDEX idx_outbound_messages_session ON OutboundMessages(session_id);
