CREATE TYPE appointment_status AS ENUM ('PENDING', 'CONFIRMED', 'ATTENDED', 'NO_SHOW', 'CANCELED');
CREATE TYPE appointment_reason AS ENUM ('REQUIRES_IN_PERSON', 'NOT_RESOLVED');

CREATE TABLE Appointments (
    id BIGSERIAL PRIMARY KEY,
    appointment_code UUID NOT NULL DEFAULT gen_random_uuid(),

    session_id BIGINT NOT NULL REFERENCES Sessions(id),
    question_id BIGINT NOT NULL REFERENCES Questions(id),
    reason appointment_reason NOT NULL,

    name VARCHAR(150) NOT NULL,
    cpf_hash VARCHAR(64) NOT NULL,
    cpf_masked VARCHAR(14) NOT NULL,
    phone_encrypted TEXT,
    by_representative BOOLEAN NOT NULL DEFAULT FALSE,
    documents_sent JSONB NOT NULL,

    appointment_datetime TIMESTAMPTZ NOT NULL,
    rescheduled_from TIMESTAMPTZ,
    off_grid BOOLEAN NOT NULL DEFAULT FALSE,

    status appointment_status NOT NULL DEFAULT 'PENDING',
    assigned_user_id BIGINT REFERENCES Users(id),

    request_datetime TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uniq_appointments_code UNIQUE (appointment_code),
    CONSTRAINT chk_appointments_cpf_hash CHECK (cpf_hash ~ '^[0-9a-f]{64}$'),
    CONSTRAINT chk_appointments_cpf_masked CHECK (cpf_masked ~ '^\*{3}\.[0-9]{3}\.[0-9]{3}-\*{2}$'),
    CONSTRAINT chk_appointments_phone_encrypted CHECK (phone_encrypted IS NULL OR phone_encrypted ~ '^v1:[A-Za-z0-9+/]+={0,2}:[A-Za-z0-9+/]+={0,2}:[A-Za-z0-9+/]+={0,2}$'),
    CONSTRAINT chk_appointments_documents_sent CHECK (
        jsonb_typeof(documents_sent) = 'object'
        AND jsonb_typeof(documents_sent -> 'group') IS NOT DISTINCT FROM 'array'
        AND jsonb_typeof(documents_sent -> 'question') IS NOT DISTINCT FROM 'array'
    ),
    CONSTRAINT chk_appointments_pending_unassigned CHECK (status <> 'PENDING' OR assigned_user_id IS NULL),
    CONSTRAINT chk_appointments_confirmed_assigned CHECK (status NOT IN ('CONFIRMED', 'ATTENDED', 'NO_SHOW') OR assigned_user_id IS NOT NULL)
);

CREATE INDEX idx_appointments_cpf_hash ON Appointments(cpf_hash);
CREATE INDEX idx_appointments_status_datetime ON Appointments(status, appointment_datetime);
CREATE INDEX idx_appointments_datetime_active ON Appointments(appointment_datetime) WHERE status IN ('PENDING', 'CONFIRMED');
CREATE INDEX idx_appointments_assigned ON Appointments(assigned_user_id);
CREATE INDEX idx_appointments_session ON Appointments(session_id);
CREATE INDEX idx_appointments_question ON Appointments(question_id);

CREATE UNIQUE INDEX uniq_appointments_active
    ON Appointments(cpf_hash, appointment_datetime)
    WHERE status IN ('PENDING', 'CONFIRMED');
