-- Up Migration
UPDATE ConversationEvents
SET data = (data - 'llmStatus') || jsonb_build_object('llm', data -> 'llmStatus')
WHERE type = 'ANSWER_SENT'
  AND jsonb_typeof(data) = 'object'
  AND data ? 'llmStatus'
  AND NOT data ? 'llm';

UPDATE ConversationEvents
SET data = (data - 'byRepresentative') || jsonb_build_object('by_representative', data -> 'byRepresentative')
WHERE type = 'ATTENDEE_CHOSEN'
  AND jsonb_typeof(data) = 'object'
  AND data ? 'byRepresentative'
  AND NOT data ? 'by_representative';

ALTER TABLE ConversationEvents
    ADD CONSTRAINT chk_conversation_events_data_keys CHECK (
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
    ) NOT VALID,
    ADD CONSTRAINT chk_conversation_events_data_values CHECK (
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
    ) NOT VALID;

DO $$
BEGIN
    ALTER TABLE ConversationEvents VALIDATE CONSTRAINT chk_conversation_events_data_keys;
    ALTER TABLE ConversationEvents VALIDATE CONSTRAINT chk_conversation_events_data_values;
EXCEPTION
    WHEN check_violation THEN
        RAISE EXCEPTION 'A migration 13_conversation_events_data_checks encontrou eventos em ConversationEvents com chave ou valor de data fora do contrato. Corrija ou apague essas linhas (contrato em .docs/database/database.md) e rode a migration de novo.';
END
$$;

-- Down Migration
ALTER TABLE ConversationEvents
    DROP CONSTRAINT chk_conversation_events_data_values,
    DROP CONSTRAINT chk_conversation_events_data_keys;
