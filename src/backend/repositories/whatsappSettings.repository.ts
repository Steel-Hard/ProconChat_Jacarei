import getPool from "../db/connection"
import { AccessTokenLifetime, WhatsAppSettingsRow } from "../types/whatsappSettings.types"
import { WhatsAppSettingsRepository } from "./whatsappSettings.repository.interface"

interface SettingsRow {
    phone_number_id: string | null
    business_account_id: string | null
    access_token_encrypted: string | null
    app_secret_encrypted: string | null
    verify_token: string
    auto_reply_paused: boolean
    credentials_checked_at: Date | null
    credentials_valid: boolean | null
    display_phone_number: string | null
    verified_name: string | null
    access_token_permanent: boolean | null
    access_token_expires_at: Date | null
    updated_by: string | null
    updated_by_name: string | null
    updated_at: Date
}

const SELECT_WITH_USER = `
    SELECT s.phone_number_id, s.business_account_id, s.access_token_encrypted, s.app_secret_encrypted,
           s.verify_token, s.auto_reply_paused, s.credentials_checked_at, s.credentials_valid,
           s.display_phone_number, s.verified_name, s.access_token_permanent, s.access_token_expires_at, s.updated_by, u.name AS updated_by_name, s.updated_at
    FROM settings s
    LEFT JOIN Users u ON u.id = s.updated_by`

function lifetimeOf(row: SettingsRow): AccessTokenLifetime {
    if (row.access_token_permanent === true) {
        return { kind: "PERMANENT", expiresAt: null }
    }
    if (row.access_token_permanent === false && row.access_token_expires_at !== null) {
        return { kind: "EXPIRING", expiresAt: row.access_token_expires_at.toISOString() }
    }
    return { kind: "UNKNOWN", expiresAt: null }
}

function lifetimeColumns(lifetime: AccessTokenLifetime): [boolean | null, string | null] {
    if (lifetime.kind === "PERMANENT") {
        return [true, null]
    }
    if (lifetime.kind === "EXPIRING") {
        return [false, lifetime.expiresAt]
    }
    return [null, null]
}

function toRow(row: SettingsRow): WhatsAppSettingsRow {
    return {
        phoneNumberId: row.phone_number_id,
        businessAccountId: row.business_account_id,
        accessTokenEncrypted: row.access_token_encrypted,
        appSecretEncrypted: row.app_secret_encrypted,
        verifyToken: row.verify_token,
        autoReplyPaused: row.auto_reply_paused,
        credentialsCheckedAt: row.credentials_checked_at,
        credentialsValid: row.credentials_valid,
        displayPhoneNumber: row.display_phone_number,
        verifiedName: row.verified_name,
        accessTokenLifetime: lifetimeOf(row),
        updatedBy: row.updated_by === null ? null : { id: Number(row.updated_by), name: row.updated_by_name ?? "" },
        updatedAt: row.updated_at,
    }
}

async function querySettings(statement: string, params: unknown[] = []): Promise<WhatsAppSettingsRow | null> {
    const result = await getPool().query<SettingsRow>(`WITH settings AS (${statement}) ${SELECT_WITH_USER}`, params)
    const row = result.rows[0]
    return row ? toRow(row) : null
}

async function requireSettings(statement: string, params: unknown[]): Promise<WhatsAppSettingsRow> {
    const row = await querySettings(statement, params)
    if (!row) {
        throw new Error("WhatsAppSettings row not found")
    }
    return row
}

export const whatsappSettingsRepository: WhatsAppSettingsRepository = {
    findRow: () => querySettings("SELECT * FROM WhatsAppSettings WHERE id = 1"),

    async ensureRow(verifyToken) {
        await getPool().query(
            "INSERT INTO WhatsAppSettings (id, verify_token) VALUES (1, $1) ON CONFLICT (id) DO NOTHING",
            [verifyToken],
        )
        return requireSettings("SELECT * FROM WhatsAppSettings WHERE id = 1", [])
    },

    async isAutoReplyPaused() {
        const result = await getPool().query<{ auto_reply_paused: boolean }>(
            "SELECT auto_reply_paused FROM WhatsAppSettings WHERE id = 1",
        )
        return result.rows[0]?.auto_reply_paused ?? false
    },

    saveCredentials: ({
        phoneNumberId,
        businessAccountId,
        accessTokenEncrypted,
        appSecretEncrypted,
        displayPhoneNumber,
        verifiedName,
        accessTokenLifetime,
        updatedBy,
    }) => {
        const [permanent, expiresAt] = accessTokenLifetime === null ? [null, null] : lifetimeColumns(accessTokenLifetime)
        return requireSettings(
            `UPDATE WhatsAppSettings
             SET phone_number_id = $1, business_account_id = $2, access_token_encrypted = $3,
                 app_secret_encrypted = $4, credentials_valid = TRUE, credentials_checked_at = now(),
                 display_phone_number = $5, verified_name = $6,
                 access_token_permanent = CASE WHEN $8::boolean THEN $9::boolean ELSE access_token_permanent END,
                 access_token_expires_at = CASE WHEN $8::boolean THEN $10::timestamptz ELSE access_token_expires_at END,
                 updated_by = $7, updated_at = now()
             WHERE id = 1
             RETURNING *`,
            [
                phoneNumberId,
                businessAccountId,
                accessTokenEncrypted,
                appSecretEncrypted,
                displayPhoneNumber,
                verifiedName,
                updatedBy,
                accessTokenLifetime !== null,
                permanent,
                expiresAt,
            ],
        )
    },

    async recordCredentialsCheck(valid, verified, lifetime) {
        if (verified && lifetime) {
            const [permanent, expiresAt] = lifetimeColumns(lifetime)
            await getPool().query(
                `UPDATE WhatsAppSettings
                 SET credentials_valid = $1, credentials_checked_at = now(),
                     display_phone_number = $2, verified_name = $3,
                     access_token_permanent = $4, access_token_expires_at = $5
                 WHERE id = 1`,
                [valid, verified.displayPhoneNumber, verified.verifiedName, permanent, expiresAt],
            )
            return
        }
        if (verified) {
            await getPool().query(
                `UPDATE WhatsAppSettings
                 SET credentials_valid = $1, credentials_checked_at = now(),
                     display_phone_number = $2, verified_name = $3
                 WHERE id = 1`,
                [valid, verified.displayPhoneNumber, verified.verifiedName],
            )
            return
        }
        await getPool().query(
            "UPDATE WhatsAppSettings SET credentials_valid = $1, credentials_checked_at = now() WHERE id = 1",
            [valid],
        )
    },

    setAutoReplyPaused: (paused, updatedBy) =>
        requireSettings(
            `UPDATE WhatsAppSettings
             SET auto_reply_paused = $1, updated_by = $2, updated_at = now()
             WHERE id = 1
             RETURNING *`,
            [paused, updatedBy],
        ),

    async touchLastWebhookEvent(at) {
        await getPool().query("UPDATE WhatsAppSettings SET last_webhook_event_at = $1 WHERE id = 1", [at])
    },
}
