-- Up Migration
CREATE EXTENSION IF NOT EXISTS unaccent;

ALTER TABLE Users
    ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN last_login_at TIMESTAMPTZ,
    ADD COLUMN session_version INTEGER NOT NULL DEFAULT 0,
    ADD CONSTRAINT chk_users_session_version CHECK (session_version >= 0);

CREATE UNIQUE INDEX uniq_users_single_admin ON Users(is_admin) WHERE is_admin;

ALTER TABLE Categories
    ADD COLUMN short_title TEXT,
    ADD COLUMN position INT NOT NULL DEFAULT 0,
    ADD COLUMN seed_key VARCHAR(80),
    ADD COLUMN updated_by BIGINT REFERENCES Users(id);

ALTER TABLE Questions
    ADD COLUMN short_title TEXT,
    ADD COLUMN short_description TEXT,
    ADD COLUMN position INT NOT NULL DEFAULT 0,
    ADD COLUMN llm_allowed BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN seed_key VARCHAR(80),
    ADD COLUMN updated_by BIGINT REFERENCES Users(id);

ALTER TABLE RequiredDocuments
    ADD COLUMN position INT NOT NULL DEFAULT 0;

UPDATE Categories c
SET short_title = btrim(left(c.title, 24)),
    position = o.pos
FROM (SELECT id, row_number() OVER (ORDER BY id) - 1 AS pos FROM Categories) o
WHERE o.id = c.id;

UPDATE Questions q
SET short_title = btrim(left(q.question, 24)),
    llm_allowed = NOT q.out_of_scope,
    position = o.pos
FROM (SELECT id, row_number() OVER (PARTITION BY category_id ORDER BY id) - 1 AS pos FROM Questions) o
WHERE o.id = q.id;

UPDATE RequiredDocuments d
SET position = o.pos
FROM (SELECT id, row_number() OVER (PARTITION BY question_id ORDER BY id) - 1 AS pos FROM RequiredDocuments) o
WHERE o.id = d.id;

ALTER TABLE Categories ALTER COLUMN short_title SET NOT NULL;
ALTER TABLE Questions ALTER COLUMN short_title SET NOT NULL;

ALTER TABLE Categories
    ADD CONSTRAINT chk_categories_short_title_length CHECK (char_length(btrim(short_title)) BETWEEN 1 AND 24),
    ADD CONSTRAINT chk_categories_position CHECK (position >= 0),
    ADD CONSTRAINT uniq_categories_seed_key UNIQUE (seed_key);

ALTER TABLE Questions
    ADD CONSTRAINT chk_questions_short_title_length CHECK (char_length(btrim(short_title)) BETWEEN 1 AND 24),
    ADD CONSTRAINT chk_questions_short_description_length CHECK (short_description IS NULL OR char_length(btrim(short_description)) BETWEEN 1 AND 72),
    ADD CONSTRAINT chk_questions_position CHECK (position >= 0),
    ADD CONSTRAINT chk_questions_in_person_xor_out_of_scope CHECK (NOT (requires_in_person AND out_of_scope)),
    ADD CONSTRAINT chk_questions_out_of_scope_no_llm CHECK (NOT (out_of_scope AND llm_allowed)),
    ADD CONSTRAINT chk_questions_answer_length CHECK (char_length(answer) <= 3000),
    ADD CONSTRAINT uniq_questions_seed_key UNIQUE (seed_key);

ALTER TABLE RequiredDocuments
    ADD CONSTRAINT chk_required_documents_position CHECK (position >= 0);

CREATE INDEX idx_categories_position ON Categories(position, id);
CREATE INDEX idx_questions_category_position ON Questions(category_id, position, id);

ALTER TABLE Sessions ALTER COLUMN current_step DROP DEFAULT;

ALTER TYPE session_step RENAME TO session_step_old;

CREATE TYPE session_step AS ENUM (
    'AWAITING_CATEGORY',
    'AWAITING_QUESTION',
    'AWAITING_ANSWER',
    'AWAITING_RESOLVED',
    'AWAITING_SCHEDULE_OFFER',
    'AWAITING_ATTENDEE',
    'AWAITING_HOLDER_NAME',
    'AWAITING_HOLDER_CPF',
    'AWAITING_SLOT',
    'AWAITING_RETURN_CHOICE',
    'AWAITING_CANCEL_CONFIRMATION',
    'FINISHED'
);

ALTER TABLE Sessions
    ALTER COLUMN current_step TYPE session_step USING current_step::text::session_step;

ALTER TABLE Sessions ALTER COLUMN current_step SET DEFAULT 'AWAITING_CATEGORY';

DROP TYPE session_step_old;

CREATE TYPE session_outcome AS ENUM (
    'IN_PROGRESS',
    'RESOLVED',
    'SCHEDULED',
    'OUT_OF_SCOPE',
    'NO_SLOT',
    'DECLINED',
    'MANAGED_APPOINTMENT',
    'ABANDONED'
);

ALTER TABLE Sessions
    ADD COLUMN outcome session_outcome NOT NULL DEFAULT 'IN_PROGRESS',
    ADD COLUMN abandoned_at_step session_step,
    ADD COLUMN last_interaction_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN current_question_id BIGINT REFERENCES Questions(id) ON DELETE SET NULL,
    ADD COLUMN list_page INT NOT NULL DEFAULT 1,
    ADD COLUMN draft JSONB;

UPDATE Sessions
SET outcome = CASE status
        WHEN 'FINISHED' THEN 'RESOLVED'::session_outcome
        WHEN 'ABANDONED' THEN 'ABANDONED'::session_outcome
        ELSE 'IN_PROGRESS'::session_outcome
    END,
    abandoned_at_step = CASE WHEN status = 'ABANDONED' THEN current_step END,
    last_interaction_at = COALESCE(ended_at, started_at);

ALTER TABLE Sessions
    ADD CONSTRAINT chk_sessions_outcome_in_progress CHECK ((status = 'IN_PROGRESS') = (outcome = 'IN_PROGRESS')),
    ADD CONSTRAINT chk_sessions_outcome_abandoned CHECK ((status = 'ABANDONED') = (outcome = 'ABANDONED')),
    ADD CONSTRAINT chk_sessions_abandoned_step CHECK ((outcome = 'ABANDONED') = (abandoned_at_step IS NOT NULL)),
    ADD CONSTRAINT chk_sessions_list_page CHECK (list_page >= 1),
    ADD CONSTRAINT chk_sessions_draft_only_in_progress CHECK (draft IS NULL OR status = 'IN_PROGRESS'),
    ADD CONSTRAINT chk_sessions_draft_object CHECK (draft IS NULL OR jsonb_typeof(draft) = 'object'),
    ADD CONSTRAINT chk_sessions_draft_keys CHECK (
        draft IS NULL
        OR (draft - ARRAY['by_representative', 'holder_name', 'cpf_hash', 'cpf_masked', 'target_appointment_id']) = '{}'::jsonb
    ),
    ADD CONSTRAINT chk_sessions_draft_cpf CHECK (
        draft IS NULL
        OR (
            (draft ->> 'cpf_hash' IS NULL OR draft ->> 'cpf_hash' ~ '^[0-9a-f]{64}$')
            AND (draft ->> 'cpf_masked' IS NULL OR draft ->> 'cpf_masked' ~ '^\*{3}\.[0-9]{3}\.[0-9]{3}-\*{2}$')
        )
    );

CREATE INDEX idx_sessions_last_interaction ON Sessions(last_interaction_at) WHERE status = 'IN_PROGRESS';
CREATE INDEX idx_sessions_started_at ON Sessions(started_at);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM Appointments) THEN
        RAISE EXCEPTION 'A migration 11_sprint2_schema recria a tabela Appointments, mas ela tem linhas. Apague os agendamentos de teste (DELETE FROM Appointments) e rode a migration de novo.';
    END IF;
END
$$;

DROP TABLE Appointments;
DROP TYPE appointment_status;

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

DROP TABLE Interactions;

CREATE TYPE conversation_event_type AS ENUM (
    'STARTED',
    'CATEGORY_CHOSEN',
    'QUESTION_CHOSEN',
    'ANSWER_SENT',
    'RESOLVED_ANSWERED',
    'SCHEDULE_OFFERED',
    'NO_SLOT',
    'SCHEDULE_DECLINED',
    'ATTENDEE_CHOSEN',
    'PHONE_NOTICE_SHOWN',
    'APPOINTMENT_CREATED',
    'APPOINTMENT_CONSULTED',
    'APPOINTMENT_RESCHEDULED',
    'APPOINTMENT_CANCELED',
    'ABANDONED'
);

CREATE TABLE ConversationEvents (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES Sessions(id) ON DELETE CASCADE,
    type conversation_event_type NOT NULL,
    category_id BIGINT REFERENCES Categories(id),
    question_id BIGINT REFERENCES Questions(id),
    appointment_id BIGINT REFERENCES Appointments(id),
    data JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_conversation_events_data_object CHECK (jsonb_typeof(data) = 'object')
);

CREATE INDEX idx_conversation_events_session ON ConversationEvents(session_id, created_at);
CREATE INDEX idx_conversation_events_type_date ON ConversationEvents(type, created_at);
CREATE INDEX idx_conversation_events_category ON ConversationEvents(category_id);
CREATE INDEX idx_conversation_events_question ON ConversationEvents(question_id);
CREATE INDEX idx_conversation_events_appointment ON ConversationEvents(appointment_id);

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

CREATE TABLE ScheduleSettings (
    id SMALLINT PRIMARY KEY DEFAULT 1,
    slot_minutes SMALLINT NOT NULL,
    seats_per_slot SMALLINT NOT NULL,
    window_days SMALLINT NOT NULL,
    min_notice_days SMALLINT NOT NULL,
    wait_alert_days SMALLINT NOT NULL,
    unit_address TEXT NOT NULL,
    unit_address_complement TEXT,
    reminder_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    reminder_hours SMALLINT NOT NULL DEFAULT 24,
    updated_by BIGINT REFERENCES Users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_schedule_settings_singleton CHECK (id = 1),
    CONSTRAINT chk_schedule_settings_slot_minutes CHECK (slot_minutes IN (20, 30, 40, 60)),
    CONSTRAINT chk_schedule_settings_seats CHECK (seats_per_slot BETWEEN 1 AND 20),
    CONSTRAINT chk_schedule_settings_window CHECK (window_days BETWEEN 1 AND 180),
    CONSTRAINT chk_schedule_settings_min_notice CHECK (min_notice_days IN (0, 1, 2, 3, 5)),
    CONSTRAINT chk_schedule_settings_wait_alert CHECK (wait_alert_days BETWEEN 1 AND 60),
    CONSTRAINT chk_schedule_settings_reminder_hours CHECK (reminder_hours IN (2, 6, 12, 24, 48)),
    CONSTRAINT chk_schedule_settings_address CHECK (char_length(btrim(unit_address)) > 0)
);

CREATE TABLE ScheduleRanges (
    id BIGSERIAL PRIMARY KEY,
    weekday SMALLINT NOT NULL,
    slot_index SMALLINT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    CONSTRAINT chk_schedule_ranges_weekday CHECK (weekday BETWEEN 0 AND 6),
    CONSTRAINT chk_schedule_ranges_slot_index CHECK (slot_index BETWEEN 1 AND 3),
    CONSTRAINT chk_schedule_ranges_order CHECK (end_time > start_time),
    CONSTRAINT uniq_schedule_ranges_weekday_slot UNIQUE (weekday, slot_index)
);

CREATE TABLE BlockedDates (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    description VARCHAR(150) NOT NULL,
    CONSTRAINT chk_blocked_dates_period CHECK (
        (start_time IS NULL AND end_time IS NULL)
        OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
    ),
    CONSTRAINT chk_blocked_dates_description CHECK (char_length(btrim(description)) > 0)
);

CREATE INDEX idx_blocked_dates_date ON BlockedDates(date);

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

CREATE TABLE WhatsAppSettings (
    id SMALLINT PRIMARY KEY DEFAULT 1,
    phone_number_id VARCHAR(40),
    business_account_id VARCHAR(40),
    access_token_encrypted TEXT,
    app_secret_encrypted TEXT,
    verify_token VARCHAR(64) NOT NULL,
    auto_reply_paused BOOLEAN NOT NULL DEFAULT FALSE,
    credentials_checked_at TIMESTAMPTZ,
    credentials_valid BOOLEAN,
    last_webhook_event_at TIMESTAMPTZ,
    updated_by BIGINT REFERENCES Users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_whatsapp_settings_singleton CHECK (id = 1),
    CONSTRAINT chk_whatsapp_settings_access_token_encrypted CHECK (access_token_encrypted IS NULL OR access_token_encrypted ~ '^v1:[A-Za-z0-9+/]+={0,2}:[A-Za-z0-9+/]+={0,2}:[A-Za-z0-9+/]+={0,2}$'),
    CONSTRAINT chk_whatsapp_settings_app_secret_encrypted CHECK (app_secret_encrypted IS NULL OR app_secret_encrypted ~ '^v1:[A-Za-z0-9+/]+={0,2}:[A-Za-z0-9+/]+={0,2}:[A-Za-z0-9+/]+={0,2}$')
);

-- Down Migration
DROP TABLE WhatsAppSettings;

DROP TABLE AttendanceDocuments;
DROP TYPE attendee_group;

DROP TABLE BlockedDates;
DROP TABLE ScheduleRanges;
DROP TABLE ScheduleSettings;

DROP TABLE AppointmentEvents;
DROP TYPE appointment_event_type;

DROP TRIGGER trg_appointment_notes_immutable ON AppointmentNotes;
DROP TABLE AppointmentNotes;
DROP FUNCTION reject_appointment_note_change();

DROP TABLE ConversationEvents;
DROP TYPE conversation_event_type;

CREATE TABLE Interactions (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES Sessions(id),
    category_id BIGINT REFERENCES Categories(id),
    question_id BIGINT REFERENCES Questions(id),

    answered_via_llm BOOLEAN NOT NULL DEFAULT FALSE,
    llm_answer_text TEXT,

    ended_in_appointment BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_interactions_session ON Interactions(session_id);
CREATE INDEX idx_interactions_category ON Interactions(category_id);
CREATE INDEX idx_interactions_question ON Interactions(question_id);

DROP TABLE Appointments;
DROP TYPE appointment_reason;
DROP TYPE appointment_status;

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

DROP INDEX idx_sessions_started_at;
DROP INDEX idx_sessions_last_interaction;

ALTER TABLE Sessions
    DROP CONSTRAINT chk_sessions_draft_cpf,
    DROP CONSTRAINT chk_sessions_draft_keys,
    DROP CONSTRAINT chk_sessions_draft_object,
    DROP CONSTRAINT chk_sessions_draft_only_in_progress,
    DROP CONSTRAINT chk_sessions_list_page,
    DROP CONSTRAINT chk_sessions_abandoned_step,
    DROP CONSTRAINT chk_sessions_outcome_abandoned,
    DROP CONSTRAINT chk_sessions_outcome_in_progress;

ALTER TABLE Sessions
    DROP COLUMN draft,
    DROP COLUMN list_page,
    DROP COLUMN current_question_id,
    DROP COLUMN last_interaction_at,
    DROP COLUMN abandoned_at_step,
    DROP COLUMN outcome;

DROP TYPE session_outcome;

UPDATE Sessions
SET current_step = CASE WHEN status = 'IN_PROGRESS' THEN 'AWAITING_CATEGORY'::session_step ELSE 'FINISHED'::session_step END
WHERE current_step NOT IN ('AWAITING_CATEGORY', 'AWAITING_QUESTION', 'FINISHED');

ALTER TABLE Sessions ALTER COLUMN current_step DROP DEFAULT;

ALTER TYPE session_step RENAME TO session_step_old;

CREATE TYPE session_step AS ENUM ('AWAITING_CATEGORY', 'AWAITING_QUESTION', 'FINISHED');

ALTER TABLE Sessions
    ALTER COLUMN current_step TYPE session_step USING current_step::text::session_step;

ALTER TABLE Sessions ALTER COLUMN current_step SET DEFAULT 'AWAITING_CATEGORY';

DROP TYPE session_step_old;

DROP INDEX idx_questions_category_position;
DROP INDEX idx_categories_position;

ALTER TABLE RequiredDocuments
    DROP CONSTRAINT chk_required_documents_position,
    DROP COLUMN position;

ALTER TABLE Questions
    DROP CONSTRAINT uniq_questions_seed_key,
    DROP CONSTRAINT chk_questions_answer_length,
    DROP CONSTRAINT chk_questions_out_of_scope_no_llm,
    DROP CONSTRAINT chk_questions_in_person_xor_out_of_scope,
    DROP CONSTRAINT chk_questions_position,
    DROP CONSTRAINT chk_questions_short_description_length,
    DROP CONSTRAINT chk_questions_short_title_length,
    DROP COLUMN updated_by,
    DROP COLUMN seed_key,
    DROP COLUMN llm_allowed,
    DROP COLUMN position,
    DROP COLUMN short_description,
    DROP COLUMN short_title;

ALTER TABLE Categories
    DROP CONSTRAINT uniq_categories_seed_key,
    DROP CONSTRAINT chk_categories_position,
    DROP CONSTRAINT chk_categories_short_title_length,
    DROP COLUMN updated_by,
    DROP COLUMN seed_key,
    DROP COLUMN position,
    DROP COLUMN short_title;

DROP INDEX uniq_users_single_admin;

ALTER TABLE Users
    DROP CONSTRAINT chk_users_session_version,
    DROP COLUMN session_version,
    DROP COLUMN last_login_at,
    DROP COLUMN is_admin;

DROP EXTENSION IF EXISTS unaccent;
