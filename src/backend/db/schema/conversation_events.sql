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
    CONSTRAINT chk_conversation_events_data_object CHECK (jsonb_typeof(data) = 'object'),
    CONSTRAINT chk_conversation_events_data_keys CHECK (
        jsonb_typeof(data) <> 'object'
        OR (
            data - CASE type
                WHEN 'ANSWER_SENT' THEN ARRAY['llm']
                WHEN 'RESOLVED_ANSWERED' THEN ARRAY['resolved']
                WHEN 'SCHEDULE_OFFERED' THEN ARRAY['reason']
                WHEN 'ATTENDEE_CHOSEN' THEN ARRAY['by_representative']
                WHEN 'APPOINTMENT_RESCHEDULED' THEN ARRAY['from', 'to']
                WHEN 'ABANDONED' THEN ARRAY['step']
                ELSE ARRAY[]::text[]
            END
        ) = '{}'::jsonb
    ),
    CONSTRAINT chk_conversation_events_data_values CHECK (
        jsonb_typeof(data) <> 'object'
        OR (
            (NOT data ? 'llm' OR (
                jsonb_typeof(data -> 'llm') = 'string'
                AND data ->> 'llm' IN ('NOT_CALLED', 'USED', 'FAILED')
            ))
            AND (NOT data ? 'reason' OR (
                jsonb_typeof(data -> 'reason') = 'string'
                AND data ->> 'reason' IN ('REQUIRES_IN_PERSON', 'NOT_RESOLVED')
            ))
            AND (NOT data ? 'step' OR (
                jsonb_typeof(data -> 'step') = 'string'
                AND data ->> 'step' IN (
                    'AWAITING_CATEGORY', 'AWAITING_QUESTION', 'AWAITING_ANSWER', 'AWAITING_RESOLVED',
                    'AWAITING_SCHEDULE_OFFER', 'AWAITING_ATTENDEE', 'AWAITING_HOLDER_NAME', 'AWAITING_HOLDER_CPF',
                    'AWAITING_SLOT', 'AWAITING_RETURN_CHOICE', 'AWAITING_CANCEL_CONFIRMATION'
                )
            ))
            AND (NOT data ? 'resolved' OR jsonb_typeof(data -> 'resolved') = 'boolean')
            AND (NOT data ? 'by_representative' OR jsonb_typeof(data -> 'by_representative') = 'boolean')
            AND (NOT data ? 'from' OR (
                jsonb_typeof(data -> 'from') = 'string'
                AND data ->> 'from' ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$'
            ))
            AND (NOT data ? 'to' OR (
                jsonb_typeof(data -> 'to') = 'string'
                AND data ->> 'to' ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$'
            ))
        )
    )
);

CREATE INDEX idx_conversation_events_session ON ConversationEvents(session_id, created_at);
CREATE INDEX idx_conversation_events_type_date ON ConversationEvents(type, created_at);
CREATE INDEX idx_conversation_events_category ON ConversationEvents(category_id);
CREATE INDEX idx_conversation_events_question ON ConversationEvents(question_id);
CREATE INDEX idx_conversation_events_appointment ON ConversationEvents(appointment_id);
