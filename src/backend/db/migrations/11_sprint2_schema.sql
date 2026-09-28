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
