CREATE TABLE AppointmentNotes (
    id BIGSERIAL PRIMARY KEY,
    appointment_id BIGINT NOT NULL REFERENCES Appointments(id),
    author_user_id BIGINT NOT NULL REFERENCES Users(id),
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_appointment_notes_text CHECK (char_length(btrim(text)) > 0)
);

CREATE INDEX idx_appointment_notes_appointment ON AppointmentNotes(appointment_id, created_at);

CREATE FUNCTION reject_appointment_note_change() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'AppointmentNotes são imutáveis';
END;
$$;

CREATE TRIGGER trg_appointment_notes_immutable
    BEFORE UPDATE OR DELETE ON AppointmentNotes
    FOR EACH ROW EXECUTE FUNCTION reject_appointment_note_change();
