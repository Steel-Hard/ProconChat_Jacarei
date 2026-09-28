CREATE TABLE WhatsAppSettings (
    id SMALLINT PRIMARY KEY DEFAULT 1,
    phone_number_id VARCHAR(40),
    business_account_id VARCHAR(40),
    access_token_encrypted TEXT,
    app_secret_encrypted TEXT,
    verify_token VARCHAR(64) NOT NULL,
    auto_reply_paused BOOLEAN NOT NULL DEFAULT FALSE,
    credentials_checked_at TIMESTAMPTZ,
    credentials_valid BOOLEAN,
    last_webhook_event_at TIMESTAMPTZ,
    updated_by BIGINT REFERENCES Users(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_whatsapp_settings_singleton CHECK (id = 1),
    CONSTRAINT chk_whatsapp_settings_access_token_encrypted CHECK (access_token_encrypted IS NULL OR access_token_encrypted ~ '^v1:[A-Za-z0-9+/]+={0,2}:[A-Za-z0-9+/]+={0,2}:[A-Za-z0-9+/]+={0,2}$'),
    CONSTRAINT chk_whatsapp_settings_app_secret_encrypted CHECK (app_secret_encrypted IS NULL OR app_secret_encrypted ~ '^v1:[A-Za-z0-9+/]+={0,2}:[A-Za-z0-9+/]+={0,2}:[A-Za-z0-9+/]+={0,2}$')
);
