import getPool from "../../../db/connection"
import { encrypt } from "../../../utils/crypto.utils"

export const E2E_WHATSAPP = {
    phoneNumberId: "109876543210001",
    accessToken: "e2e-access-token",
    appSecret: "e2e-app-secret",
    verifyToken: "e2e-verify-token",
}

export type WhatsAppSettingsSnapshot = Record<string, unknown> | undefined

export async function snapshotWhatsAppSettings(): Promise<WhatsAppSettingsSnapshot> {
    const result = await getPool().query<Record<string, unknown>>("SELECT * FROM WhatsAppSettings WHERE id = 1")
    return result.rows[0]
}

export async function useE2eWhatsAppSettings(): Promise<void> {
    const pool = getPool()
    await pool.query("DELETE FROM WhatsAppSettings")
    await pool.query(
        `INSERT INTO WhatsAppSettings (id, phone_number_id, access_token_encrypted, app_secret_encrypted, verify_token, auto_reply_paused, cancellation_notice_enabled)
         VALUES (1, $1, $2, $3, $4, false, false)`,
        [E2E_WHATSAPP.phoneNumberId, encrypt(E2E_WHATSAPP.accessToken), encrypt(E2E_WHATSAPP.appSecret), E2E_WHATSAPP.verifyToken],
    )
}

export async function setCancellationNotice(enabled: boolean): Promise<void> {
    await getPool().query("UPDATE WhatsAppSettings SET cancellation_notice_enabled = $1 WHERE id = 1", [enabled])
}

export async function restoreWhatsAppSettings(snapshot: WhatsAppSettingsSnapshot): Promise<void> {
    const pool = getPool()
    await pool.query("DELETE FROM WhatsAppSettings")
    if (!snapshot) {
        return
    }
    const columns = Object.keys(snapshot)
    await pool.query(
        `INSERT INTO WhatsAppSettings (${columns.join(", ")}) VALUES (${columns.map((_column, index) => `$${index + 1}`).join(", ")})`,
        columns.map((column) => snapshot[column]),
    )
}
