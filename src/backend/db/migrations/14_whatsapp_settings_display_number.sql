-- Up Migration
ALTER TABLE WhatsAppSettings
    ADD COLUMN display_phone_number VARCHAR(40),
    ADD COLUMN verified_name VARCHAR(255);

-- Down Migration
ALTER TABLE WhatsAppSettings
    DROP COLUMN verified_name,
    DROP COLUMN display_phone_number;
