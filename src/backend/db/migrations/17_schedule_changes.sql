-- Up Migration
CREATE TABLE ScheduleChanges (
    effective_from DATE PRIMARY KEY,
    config JSONB NOT NULL,
    updated_by BIGINT NOT NULL REFERENCES Users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_schedule_changes_config_object CHECK (jsonb_typeof(config) = 'object')
);

-- Down Migration
DROP TABLE ScheduleChanges;