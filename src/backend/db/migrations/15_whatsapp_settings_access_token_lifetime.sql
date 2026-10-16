-- Up Migration
ALTER TABLE WhatsAppSettings
    ADD COLUMN access_token_permanent BOOLEAN,
    ADD COLUMN access_token_expires_at TIMESTAMPTZ,
    ADD CONSTRAINT chk_whatsapp_settings_access_token_lifetime CHECK (
        (access_token_permanent IS NULL AND access_token_expires_at IS NULL)
        OR (access_token_permanent IS TRUE AND access_token_expires_at IS NULL)
        OR (access_token_permanent IS FALSE AND access_token_expires_at IS NOT NULL)
    );

-- Down Migration
ALTER TABLE WhatsAppSettings
    DROP CONSTRAINT chk_whatsapp_settings_access_token_lifetime,
    DROP COLUMN access_token_expires_at,
    DROP COLUMN access_token_permanent;
