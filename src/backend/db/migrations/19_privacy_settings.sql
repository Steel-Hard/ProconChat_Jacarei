-- Up Migration
CREATE TABLE PrivacySettings (
    id SMALLINT PRIMARY KEY DEFAULT 1,
    controller_name VARCHAR(150),
    dpo_name VARCHAR(150),
    contact_email VARCHAR(254),
    in_person_contact VARCHAR(300),
    retention_text TEXT,
    updated_by BIGINT REFERENCES Users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_privacy_settings_singleton CHECK (id = 1),
    CONSTRAINT chk_privacy_settings_controller_name CHECK (controller_name IS NULL OR (char_length(controller_name) BETWEEN 1 AND 150 AND controller_name = btrim(controller_name))),
    CONSTRAINT chk_privacy_settings_dpo_name CHECK (dpo_name IS NULL OR (char_length(dpo_name) BETWEEN 1 AND 150 AND dpo_name = btrim(dpo_name))),
    CONSTRAINT chk_privacy_settings_contact_email CHECK (contact_email IS NULL OR (contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' AND contact_email = btrim(contact_email))),
    CONSTRAINT chk_privacy_settings_in_person_contact CHECK (in_person_contact IS NULL OR (char_length(in_person_contact) BETWEEN 1 AND 300 AND in_person_contact = btrim(in_person_contact))),
    CONSTRAINT chk_privacy_settings_retention_text CHECK (retention_text IS NULL OR (char_length(retention_text) BETWEEN 1 AND 2000 AND retention_text = btrim(retention_text)))
);

-- Down Migration
DROP TABLE PrivacySettings;
