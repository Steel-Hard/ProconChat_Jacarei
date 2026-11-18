-- Up Migration
ALTER TABLE WhatsAppSettings
    ADD COLUMN cancellation_notice_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TYPE appointment_event_type RENAME TO appointment_event_type_old;

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
    'CITIZEN_NOTICE_DISABLED',
    'REMINDER_SENT',
    'KEPT_OFF_GRID'
);

ALTER TABLE AppointmentEvents
    ALTER COLUMN type TYPE appointment_event_type USING type::text::appointment_event_type;

DROP TYPE appointment_event_type_old;

-- Down Migration
DELETE FROM AppointmentEvents WHERE type = 'CITIZEN_NOTICE_DISABLED';

ALTER TYPE appointment_event_type RENAME TO appointment_event_type_new;

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

ALTER TABLE AppointmentEvents
    ALTER COLUMN type TYPE appointment_event_type USING type::text::appointment_event_type;

DROP TYPE appointment_event_type_new;

ALTER TABLE WhatsAppSettings DROP COLUMN cancellation_notice_enabled;
