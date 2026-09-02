CREATE TYPE appointment_status AS ENUM ('SCHEDULED', 'CANCELED', 'ATTENDED');

CREATE TABLE Appointments (
    id BIGSERIAL PRIMARY KEY,
    appointment_code UUID NOT NULL DEFAULT gen_random_uuid(),

    cpf_hash VARCHAR(64) NOT NULL,
    name VARCHAR(150) NOT NULL,

    appointment_reason TEXT NOT NULL,

    professional VARCHAR(50) NOT NULL CHECK (professional IN ('LAWYER', 'ATTENDANT')),

    appointment_datetime TIMESTAMPTZ NOT NULL,
    request_datetime TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    status appointment_status NOT NULL DEFAULT 'SCHEDULED',

    notes TEXT
);

CREATE INDEX idx_appointments_cpf_hash ON Appointments(cpf_hash);
CREATE INDEX idx_appointments_code ON Appointments(appointment_code);
CREATE INDEX idx_appointments_datetime ON Appointments(appointment_datetime);

CREATE UNIQUE INDEX uniq_appointments_active
ON Appointments(cpf_hash, appointment_datetime)
WHERE status = 'SCHEDULED';
