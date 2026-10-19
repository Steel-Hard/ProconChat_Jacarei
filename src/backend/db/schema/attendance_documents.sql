CREATE TYPE attendee_group AS ENUM ('HOLDER', 'REPRESENTATIVE');

CREATE TABLE AttendanceDocuments (
    id BIGSERIAL PRIMARY KEY,
    attendee_group attendee_group NOT NULL,
    description VARCHAR(255) NOT NULL,
    position INT NOT NULL DEFAULT 0,
    CONSTRAINT chk_attendance_documents_description CHECK (char_length(btrim(description)) > 0),
    CONSTRAINT chk_attendance_documents_position CHECK (position >= 0)
);

CREATE INDEX idx_attendance_documents_group_position ON AttendanceDocuments(attendee_group, position, id);
