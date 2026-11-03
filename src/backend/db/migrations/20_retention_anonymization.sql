-- Up Migration
ALTER TABLE Sessions
    ADD COLUMN anonymized_at TIMESTAMPTZ,
    ALTER COLUMN phone_hash DROP NOT NULL,
    ADD CONSTRAINT chk_sessions_anonymized CHECK ((phone_hash IS NULL) = (anonymized_at IS NOT NULL)),
    ADD CONSTRAINT chk_sessions_anonymized_finished CHECK (anonymized_at IS NULL OR status <> 'IN_PROGRESS');

CREATE INDEX idx_sessions_retention
    ON Sessions ((COALESCE(ended_at, last_interaction_at)))
    WHERE anonymized_at IS NULL AND status <> 'IN_PROGRESS';

ALTER TABLE Appointments
    ADD COLUMN anonymized_at TIMESTAMPTZ,
    ALTER COLUMN cpf_hash DROP NOT NULL,
    ALTER COLUMN cpf_masked DROP NOT NULL,
    ADD CONSTRAINT chk_appointments_anonymized CHECK (
        (anonymized_at IS NULL AND cpf_hash IS NOT NULL AND cpf_masked IS NOT NULL)
        OR (
            anonymized_at IS NOT NULL
            AND cpf_hash IS NULL
            AND cpf_masked IS NULL
            AND phone_encrypted IS NULL
            AND name = 'Titular removido'
        )
    );

CREATE INDEX idx_appointments_retention
    ON Appointments (appointment_datetime)
    WHERE anonymized_at IS NULL;

ALTER TABLE PrivacySettings
    ADD COLUMN retention_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN session_retention_days SMALLINT NOT NULL DEFAULT 90,
    ADD COLUMN appointment_retention_days SMALLINT NOT NULL DEFAULT 365,
    ADD CONSTRAINT chk_privacy_settings_session_retention_days CHECK (session_retention_days BETWEEN 30 AND 1825),
    ADD CONSTRAINT chk_privacy_settings_appointment_retention_days CHECK (appointment_retention_days BETWEEN 90 AND 1825);

-- Down Migration
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM Sessions WHERE anonymized_at IS NOT NULL)
        OR EXISTS (SELECT 1 FROM Appointments WHERE anonymized_at IS NOT NULL) THEN
        RAISE EXCEPTION 'A migration 20_retention_anonymization não pode ser revertida: há conversas ou agendamentos anonimizados, e o dado removido não volta. Restaure um backup anterior à anonimização em vez de reverter.';
    END IF;
END
$$;

ALTER TABLE PrivacySettings
    DROP CONSTRAINT chk_privacy_settings_appointment_retention_days,
    DROP CONSTRAINT chk_privacy_settings_session_retention_days,
    DROP COLUMN appointment_retention_days,
    DROP COLUMN session_retention_days,
    DROP COLUMN retention_enabled;

DROP INDEX idx_appointments_retention;

ALTER TABLE Appointments
    DROP CONSTRAINT chk_appointments_anonymized,
    DROP COLUMN anonymized_at,
    ALTER COLUMN cpf_hash SET NOT NULL,
    ALTER COLUMN cpf_masked SET NOT NULL;

DROP INDEX idx_sessions_retention;

ALTER TABLE Sessions
    DROP CONSTRAINT chk_sessions_anonymized_finished,
    DROP CONSTRAINT chk_sessions_anonymized,
    DROP COLUMN anonymized_at,
    ALTER COLUMN phone_hash SET NOT NULL;
