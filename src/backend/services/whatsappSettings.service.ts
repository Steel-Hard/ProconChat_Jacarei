import { randomBytes } from "node:crypto"
import BadRequestError from "../errors/BadRequestError"
import ConflictError from "../errors/ConflictError"
import InternalServerError from "../errors/InternalServerError"
import WhatsAppConnectionError from "../errors/WhatsAppConnectionError"
import { MetaGraphClient } from "../clients/metaGraph.client.interface"
import { metaGraphClient } from "../clients/metaGraph.client"
import { GatewayClient, gatewayClient } from "../clients/gateway.client"
import { WhatsAppSettingsRepository } from "../repositories/whatsappSettings.repository.interface"
import { AppointmentRepository } from "../repositories/appointment.repository.interface"
import { appointmentRepository } from "../repositories/appointment.repository"
import { whatsappSettingsRepository } from "../repositories/whatsappSettings.repository"
import {
    ConnectionCheckInput,
    ConnectionTestReason,
    ConnectionTestResult,
    MessageTemplateRef,
    MetaAuthInput,
    NumberStatusView,
    SecretView,
    TemplatesStatusView,
    WhatsAppInternalConfig,
    WhatsAppSettingsInput,
    WhatsAppSettingsRow,
    WhatsAppSettingsView,
} from "../types/whatsappSettings.types"
import { decrypt as defaultDecrypt, encrypt as defaultEncrypt } from "../utils/crypto.utils"
import { MENSAGEM_ATENDIMENTO_PAUSADO, MODELO_AVISO_CANCELAMENTO, MODELO_LEMBRETE_ATENDIMENTO } from "./messageFormatter.service"

export const DEFAULT_GRAPH_API_VERSION = "v26.0"

const ID_PATTERN = /^\d{1,40}$/
const ACCESS_TOKEN_PATTERN = /^\S{1,2048}$/
const APP_SECRET_PATTERN = /^\S{1,256}$/
const MIN_LENGTH_FOR_LAST4 = 9
const WEBHOOK_PATH = "/webhooks/whatsapp"
const USAGE_WINDOW_MS = 24 * 60 * 60 * 1000

const MESSAGE_TEMPLATES: MessageTemplateRef[] = [
    { kind: "CANCELLATION", ...MODELO_AVISO_CANCELAMENTO },
    { kind: "REMINDER", ...MODELO_LEMBRETE_ATENDIMENTO },
]

const DEFINITIVE_FAILURES: ReadonlySet<ConnectionTestReason> = new Set([
    "INVALID_TOKEN",
    "INVALID_APP_SECRET",
    "PHONE_NUMBER_NOT_FOUND",
    "BUSINESS_ACCOUNT_NOT_FOUND",
    "PHONE_NOT_IN_ACCOUNT",
    "MISSING_PERMISSION",
])

type SecretField = "accessToken" | "appSecret"

type WhatsAppSettingsEnv = Partial<Record<"PUBLIC_BASE_URL" | "WHATSAPP_GRAPH_API_VERSION", string>>

export interface WhatsAppSettingsService {
    getView(): Promise<WhatsAppSettingsView>
    testConnection(body: unknown): Promise<ConnectionTestResult>
    save(body: unknown, userId: number): Promise<WhatsAppSettingsView>
    pause(userId: number): Promise<WhatsAppSettingsView>
    resume(userId: number): Promise<WhatsAppSettingsView>
    getInternalConfig(): Promise<WhatsAppInternalConfig>
    isAutoReplyPaused(): Promise<boolean>
    getTemplatesStatus(): Promise<TemplatesStatusView>
    getNumberStatus(): Promise<NumberStatusView>
}

interface WhatsAppSettingsServiceDependencies {
    settings: WhatsAppSettingsRepository
    meta: MetaGraphClient
    gateway: Pick<GatewayClient, "notifyConfigChanged">
    usage: Pick<AppointmentRepository, "countNotifiedPhonesBetween">
    encrypt: (plaintext: string) => string
    decrypt: (text: string) => string
    env: WhatsAppSettingsEnv
    now: () => Date
    logger: Pick<Console, "log">
    generateVerifyToken?: () => string
}

interface PreparedCheck {
    row: WhatsAppSettingsRow
    input: WhatsAppSettingsInput
    check: ConnectionCheckInput
}

function readId(value: unknown, field: string, required: boolean): string | null {
    if (value === undefined || value === null) {
        if (required) {
            throw new BadRequestError(`${field} is required`)
        }
        return null
    }
    if (typeof value !== "string") {
        throw new BadRequestError(`${field} must be a string`)
    }
    const trimmed = value.trim()
    if (trimmed === "" && !required) {
        return null
    }
    if (!ID_PATTERN.test(trimmed)) {
        throw new BadRequestError(`${field} must contain only digits, up to 40`)
    }
    return trimmed
}

function readSecret(value: unknown, field: SecretField, pattern: RegExp, maxLength: number): string | null {
    if (value === undefined || value === null) {
        return null
    }
    if (typeof value !== "string" || !pattern.test(value)) {
        throw new BadRequestError(`${field} must have 1 to ${maxLength} characters without spaces`)
    }
    return value
}

function parseInput(body: unknown): WhatsAppSettingsInput {
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
        throw new BadRequestError("Request body must be a JSON object")
    }
    const fields = body as Record<string, unknown>
    return {
        phoneNumberId: readId(fields.phoneNumberId, "phoneNumberId", true) as string,
        businessAccountId: readId(fields.businessAccountId, "businessAccountId", false),
        accessToken: readSecret(fields.accessToken, "accessToken", ACCESS_TOKEN_PATTERN, 2048),
        appSecret: readSecret(fields.appSecret, "appSecret", APP_SECRET_PATTERN, 256),
    }
}

export function createWhatsAppSettingsService({
    settings,
    meta,
    gateway,
    usage,
    encrypt,
    decrypt,
    env,
    now,
    logger,
    generateVerifyToken = () => randomBytes(32).toString("hex"),
}: WhatsAppSettingsServiceDependencies): WhatsAppSettingsService {
    const graphApiVersion = (): string => env.WHATSAPP_GRAPH_API_VERSION || DEFAULT_GRAPH_API_VERSION

    const ensureRow = (): Promise<WhatsAppSettingsRow> => settings.ensureRow(generateVerifyToken())

    function tryDecrypt(encrypted: string, field: SecretField): string | null {
        try {
            return decrypt(encrypted)
        } catch {
            logger.log(JSON.stringify({ event: "whatsapp_settings_decrypt_failed", field }))
            return null
        }
    }

    function secretView(encrypted: string | null, field: SecretField): SecretView {
        if (encrypted === null) {
            return { configured: false, last4: null }
        }
        const plaintext = tryDecrypt(encrypted, field)
        return {
            configured: true,
            last4: plaintext !== null && plaintext.length >= MIN_LENGTH_FOR_LAST4 ? plaintext.slice(-4) : null,
        }
    }

    function webhookUrl(): string | null {
        const base = env.PUBLIC_BASE_URL
        return base ? new URL(WEBHOOK_PATH, base).toString() : null
    }

    function toView(row: WhatsAppSettingsRow): WhatsAppSettingsView {
        return {
            phoneNumberId: row.phoneNumberId,
            businessAccountId: row.businessAccountId,
            accessToken: secretView(row.accessTokenEncrypted, "accessToken"),
            appSecret: secretView(row.appSecretEncrypted, "appSecret"),
            verifyToken: row.verifyToken,
            webhookUrl: webhookUrl(),
            graphApiVersion: graphApiVersion(),
            credentialsValid: row.credentialsValid,
            credentialsCheckedAt: row.credentialsCheckedAt ? row.credentialsCheckedAt.toISOString() : null,
            autoReplyPaused: row.autoReplyPaused,
            pausedMessage: MENSAGEM_ATENDIMENTO_PAUSADO,
            updatedBy: row.updatedBy,
            updatedAt: row.updatedAt.toISOString(),
            displayPhoneNumber: row.displayPhoneNumber,
            verifiedName: row.verifiedName,
            accessTokenLifetime: row.accessTokenLifetime,
        }
    }

    function effectiveSecret(provided: string | null, encrypted: string | null, field: SecretField): string {
        if (provided !== null) {
            return provided
        }
        const saved = encrypted === null ? null : tryDecrypt(encrypted, field)
        if (saved === null) {
            throw new BadRequestError(`${field} is required`)
        }
        return saved
    }

    async function prepareCheck(body: unknown): Promise<PreparedCheck> {
        const input = parseInput(body)
        const row = await ensureRow()
        const check: ConnectionCheckInput = {
            phoneNumberId: input.phoneNumberId,
            businessAccountId: input.businessAccountId,
            accessToken: effectiveSecret(input.accessToken, row.accessTokenEncrypted, "accessToken"),
            appSecret: effectiveSecret(input.appSecret, row.appSecretEncrypted, "appSecret"),
            graphApiVersion: graphApiVersion(),
        }
        return { row, input, check }
    }

    function matchesSaved({ row, input }: PreparedCheck): boolean {
        return (
            input.phoneNumberId === row.phoneNumberId &&
            input.businessAccountId === row.businessAccountId &&
            input.accessToken === null &&
            input.appSecret === null
        )
    }

    async function notifyGateway(): Promise<void> {
        try {
            await gateway.notifyConfigChanged()
        } catch {
            logger.log(JSON.stringify({ event: "gateway_config_notify_failed" }))
        }
    }

    function decryptForGateway(encrypted: string | null, field: SecretField): string | null {
        if (encrypted === null) {
            return null
        }
        const plaintext = tryDecrypt(encrypted, field)
        if (plaintext === null) {
            throw new InternalServerError("Internal Server Error")
        }
        return plaintext
    }

    function notConfigured(): ConflictError {
        return new ConflictError("A integração com o WhatsApp não está configurada", "WHATSAPP_NOT_CONFIGURED")
    }

    async function savedAuth(): Promise<{ row: WhatsAppSettingsRow; auth: MetaAuthInput }> {
        const row = await ensureRow()
        const accessToken = row.accessTokenEncrypted === null ? null : tryDecrypt(row.accessTokenEncrypted, "accessToken")
        const appSecret = row.appSecretEncrypted === null ? null : tryDecrypt(row.appSecretEncrypted, "appSecret")
        if (accessToken === null || appSecret === null) {
            throw notConfigured()
        }
        return { row, auth: { accessToken, appSecret, graphApiVersion: graphApiVersion() } }
    }

    return {
        async getTemplatesStatus() {
            const { row, auth } = await savedAuth()
            if (!row.businessAccountId) {
                throw notConfigured()
            }
            const result = await meta.listMessageTemplates({ ...auth, businessAccountId: row.businessAccountId }, MESSAGE_TEMPLATES)
            if (!result.ok) {
                throw new WhatsAppConnectionError(result.reason)
            }
            return { checkedAt: now().toISOString(), templates: result.templates }
        },

        async getNumberStatus() {
            const { row, auth } = await savedAuth()
            if (!row.phoneNumberId) {
                throw notConfigured()
            }
            const result = await meta.getPhoneNumberStatus({ ...auth, phoneNumberId: row.phoneNumberId })
            if (!result.ok) {
                throw new WhatsAppConnectionError(result.reason)
            }
            const checkedAt = now()
            const usedLast24h = await usage.countNotifiedPhonesBetween(new Date(checkedAt.getTime() - USAGE_WINDOW_MS), checkedAt)
            return {
                checkedAt: checkedAt.toISOString(),
                qualityRating: result.qualityRating,
                messagingLimit: { tier: result.tier, dailyLimit: result.dailyLimit, usedLast24h },
            }
        },

        async getView() {
            return toView(await ensureRow())
        },

        async testConnection(body) {
            const prepared = await prepareCheck(body)
            const result = await meta.checkConnection(prepared.check)
            const checkedAt = now().toISOString()
            if (!result.ok) {
                if (matchesSaved(prepared) && DEFINITIVE_FAILURES.has(result.reason)) {
                    await settings.recordCredentialsCheck(false)
                }
                return { ...result, checkedAt }
            }
            const accessTokenLifetime = await meta.inspectAccessToken(prepared.check)
            if (matchesSaved(prepared)) {
                await settings.recordCredentialsCheck(
                    true,
                    { displayPhoneNumber: result.displayPhoneNumber, verifiedName: result.verifiedName },
                    accessTokenLifetime.kind === "UNKNOWN" ? undefined : accessTokenLifetime,
                )
            }
            return { ...result, checkedAt, accessTokenLifetime }
        },

        async save(body, userId) {
            const { row, input, check } = await prepareCheck(body)
            const result = await meta.checkConnection(check)
            if (!result.ok) {
                throw new WhatsAppConnectionError(result.reason)
            }
            const accessTokenLifetime = await meta.inspectAccessToken(check)
            const saved = await settings.saveCredentials({
                phoneNumberId: input.phoneNumberId,
                businessAccountId: input.businessAccountId,
                accessTokenEncrypted: input.accessToken === null ? (row.accessTokenEncrypted as string) : encrypt(input.accessToken),
                appSecretEncrypted: input.appSecret === null ? (row.appSecretEncrypted as string) : encrypt(input.appSecret),
                displayPhoneNumber: result.displayPhoneNumber,
                verifiedName: result.verifiedName,
                accessTokenLifetime: input.accessToken === null && accessTokenLifetime.kind === "UNKNOWN" ? null : accessTokenLifetime,
                updatedBy: userId,
            })
            await notifyGateway()
            return toView(saved)
        },

        async pause(userId) {
            await ensureRow()
            return toView(await settings.setAutoReplyPaused(true, userId))
        },

        async resume(userId) {
            await ensureRow()
            return toView(await settings.setAutoReplyPaused(false, userId))
        },

        async getInternalConfig() {
            const row = await settings.findRow()
            if (!row) {
                throw new InternalServerError("Internal Server Error")
            }
            return {
                phoneNumberId: row.phoneNumberId,
                accessToken: decryptForGateway(row.accessTokenEncrypted, "accessToken"),
                appSecret: decryptForGateway(row.appSecretEncrypted, "appSecret"),
                verifyToken: row.verifyToken,
                graphApiVersion: graphApiVersion(),
            }
        },

        isAutoReplyPaused: () => settings.isAutoReplyPaused(),
    }
}

export const whatsappSettingsService = createWhatsAppSettingsService({
    settings: whatsappSettingsRepository,
    meta: metaGraphClient,
    gateway: gatewayClient,
    usage: appointmentRepository,
    encrypt: defaultEncrypt,
    decrypt: defaultDecrypt,
    env: process.env,
    now: () => new Date(),
    logger: console,
})
