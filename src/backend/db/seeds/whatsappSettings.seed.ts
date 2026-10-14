import { randomBytes } from "node:crypto"
import { PoolClient } from "pg"
import { encrypt as defaultEncrypt } from "../../utils/crypto.utils"

export type WhatsAppSettingsSeedOutcome = "created" | "kept"

type WhatsAppSettingsSeedEnv = Partial<
    Record<
        | "WHATSAPP_PHONE_NUMBER_ID"
        | "WHATSAPP_BUSINESS_ACCOUNT_ID"
        | "WHATSAPP_ACCESS_TOKEN"
        | "WHATSAPP_APP_SECRET"
        | "WHATSAPP_VERIFY_TOKEN",
        string
    >
>

interface WhatsAppSettingsSeedDependencies {
    encrypt?: (plaintext: string) => string
}

const ID_PATTERN = /^\d{1,40}$/
const VERIFY_TOKEN_PATTERN = /^[\x21-\x7E]{1,64}$/

function readOptional(value: string | undefined): string | null {
    const trimmed = value?.trim()
    return trimmed ? trimmed : null
}

function readId(env: WhatsAppSettingsSeedEnv, name: "WHATSAPP_PHONE_NUMBER_ID" | "WHATSAPP_BUSINESS_ACCOUNT_ID"): string | null {
    const value = readOptional(env[name])
    if (value !== null && !ID_PATTERN.test(value)) {
        throw new Error(`${name} must contain only digits, up to 40`)
    }
    return value
}

function readVerifyToken(env: WhatsAppSettingsSeedEnv): string {
    const value = readOptional(env.WHATSAPP_VERIFY_TOKEN)
    if (value === null) {
        return randomBytes(32).toString("hex")
    }
    if (!VERIFY_TOKEN_PATTERN.test(value)) {
        throw new Error("WHATSAPP_VERIFY_TOKEN must have 1 to 64 visible characters without spaces")
    }
    return value
}

export async function seedWhatsAppSettings(
    client: PoolClient,
    env: WhatsAppSettingsSeedEnv,
    { encrypt = defaultEncrypt }: WhatsAppSettingsSeedDependencies = {},
): Promise<WhatsAppSettingsSeedOutcome> {
    const existing = await client.query("SELECT id FROM WhatsAppSettings WHERE id = 1")
    if ((existing.rowCount ?? 0) > 0) {
        return "kept"
    }

    const phoneNumberId = readId(env, "WHATSAPP_PHONE_NUMBER_ID")
    const businessAccountId = readId(env, "WHATSAPP_BUSINESS_ACCOUNT_ID")
    const verifyToken = readVerifyToken(env)
    const accessToken = readOptional(env.WHATSAPP_ACCESS_TOKEN)
    const appSecret = readOptional(env.WHATSAPP_APP_SECRET)

    await client.query(
        `INSERT INTO WhatsAppSettings
            (id, phone_number_id, business_account_id, access_token_encrypted, app_secret_encrypted, verify_token)
         VALUES (1, $1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [
            phoneNumberId,
            businessAccountId,
            accessToken === null ? null : encrypt(accessToken),
            appSecret === null ? null : encrypt(appSecret),
            verifyToken,
        ],
    )
    return "created"
}
