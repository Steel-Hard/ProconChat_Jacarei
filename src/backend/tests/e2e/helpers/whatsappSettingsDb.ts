import getPool from "../../../db/connection"
import { encrypt } from "../../../utils/crypto.utils"

export const E2E_WHATSAPP = {
    phoneNumberId: "109876543210001",
    accessToken: "e2e-access-token",
    appSecret: "e2e-app-secret",
    verifyToken: "e2e-verify-token",
} as const

type SettingsRow = Record<string, unknown>

export async function snapshotWhatsAppSettings(): Promise<SettingsRow | undefined> {
    const result = await getPool().query<SettingsRow>("SELECT * FROM WhatsAppSettings WHERE id = 1")
    return result.rows[0]
}

export async function useE2eWhatsAppSettings(): Promise<void> {
    const pool = getPool()
    await pool.query("DELETE FROM WhatsAppSettings")
    await pool.query(
        `INSERT INTO WhatsAppSettings (id, phone_number_id, access_token_encrypted, app_secret_encrypted, verify_token, auto_reply_paused)
         VALUES (1, $1, $2, $3, $4, false)`,
        [
            E2E_WHATSAPP.phoneNumberId,
            encrypt(E2E_WHATSAPP.accessToken),
            encrypt(E2E_WHATSAPP.appSecret),
            E2E_WHATSAPP.verifyToken,
        ],
    )
}

export async function restoreWhatsAppSettings(original: SettingsRow | undefined): Promise<void> {
    const pool = getPool()
    await pool.query("DELETE FROM WhatsAppSettings")
    if (!original) {
        return
    }
    const columns = Object.keys(original)
    await pool.query(
        `INSERT INTO WhatsAppSettings (${columns.join(", ")}) VALUES (${columns.map((_column, index) => `$${index + 1}`).join(", ")})`,
        columns.map((column) => original[column]),
    )
}
