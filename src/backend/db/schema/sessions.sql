CREATE TYPE session_status AS ENUM ('IN_PROGRESS', 'FINISHED', 'ABANDONED');

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

CREATE TABLE Sessions (
    id BIGSERIAL PRIMARY KEY,
    session_code UUID NOT NULL DEFAULT gen_random_uuid(),

    phone_hash VARCHAR(64) NOT NULL,

    status session_status NOT NULL DEFAULT 'IN_PROGRESS',

    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMPTZ,

    current_step session_step NOT NULL DEFAULT 'AWAITING_CATEGORY',
    current_category_id BIGINT REFERENCES Categories(id) ON DELETE SET NULL,

    outcome session_outcome NOT NULL DEFAULT 'IN_PROGRESS',
    abandoned_at_step session_step,
    last_interaction_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    current_question_id BIGINT REFERENCES Questions(id) ON DELETE SET NULL,
    list_page INT NOT NULL DEFAULT 1,
    draft JSONB,

    CONSTRAINT chk_sessions_outcome_in_progress CHECK ((status = 'IN_PROGRESS') = (outcome = 'IN_PROGRESS')),
    CONSTRAINT chk_sessions_outcome_abandoned CHECK ((status = 'ABANDONED') = (outcome = 'ABANDONED')),
    CONSTRAINT chk_sessions_abandoned_step CHECK ((outcome = 'ABANDONED') = (abandoned_at_step IS NOT NULL)),
    CONSTRAINT chk_sessions_list_page CHECK (list_page >= 1),
    CONSTRAINT chk_sessions_draft_only_in_progress CHECK (draft IS NULL OR status = 'IN_PROGRESS'),
    CONSTRAINT chk_sessions_draft_object CHECK (draft IS NULL OR jsonb_typeof(draft) = 'object'),
    CONSTRAINT chk_sessions_draft_keys CHECK (
        draft IS NULL
        OR (draft - ARRAY['by_representative', 'holder_name', 'cpf_hash', 'cpf_masked', 'target_appointment_id']) = '{}'::jsonb
    ),
    CONSTRAINT chk_sessions_draft_cpf CHECK (
        draft IS NULL
        OR (
            (draft ->> 'cpf_hash' IS NULL OR draft ->> 'cpf_hash' ~ '^[0-9a-f]{64}$')
            AND (draft ->> 'cpf_masked' IS NULL OR draft ->> 'cpf_masked' ~ '^\*{3}\.[0-9]{3}\.[0-9]{3}-\*{2}$')
        )
    )
);

CREATE INDEX idx_sessions_phone_hash ON Sessions(phone_hash);
CREATE INDEX idx_sessions_code ON Sessions(session_code);
CREATE INDEX idx_sessions_last_interaction ON Sessions(last_interaction_at) WHERE status = 'IN_PROGRESS';
CREATE INDEX idx_sessions_started_at ON Sessions(started_at);

CREATE UNIQUE INDEX uniq_sessions_phone_in_progress
ON Sessions(phone_hash)
WHERE status = 'IN_PROGRESS';
