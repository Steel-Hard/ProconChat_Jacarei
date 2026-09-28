CREATE TYPE appointment_event_type AS ENUM (
    'CREATED',
    'CLAIMED',
    'ASSIGNED',
    'RESCHEDULED',
    'BACK_TO_PENDING',
    'ATTENDED',
    'NO_SHOW',
    'RECORD_CORRECTED',
    'CANCELED_BY_CITIZEN',
    'CANCELED_BY_STAFF',
    'CITIZEN_NOTIFIED',
    'CITIZEN_NOTIFICATION_FAILED',
    'REMINDER_SENT',
    'KEPT_OFF_GRID'
);

CREATE TABLE AppointmentEvents (
    id BIGSERIAL PRIMARY KEY,
    appointment_id BIGINT NOT NULL REFERENCES Appointments(id),
    type appointment_event_type NOT NULL,
    actor_user_id BIGINT REFERENCES Users(id),
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_appointment_events_data_object CHECK (jsonb_typeof(data) = 'object')
);

CREATE INDEX idx_appointment_events_appointment ON AppointmentEvents(appointment_id, created_at);
