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
