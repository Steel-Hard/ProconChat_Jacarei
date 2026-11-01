import { DeliveryStatus, OutgoingMessage } from "../types/message.types"
import { WhatsAppConfig } from "../utils/whatsappConfig"

const BACKEND_TIMEOUT_MS = 10_000

export interface WhatsappSessionRequest {
    phone: string
    text?: string
    optionId?: string
}

export interface WhatsappSessionResponse {
    sessionId: string | null
    newSession: boolean
    paused?: boolean
    reply: { text: string; step: string | null; messages?: OutgoingMessage[] }
}

export interface WebhookEventsRequest {
    statuses: DeliveryStatus[]
}

export interface BackendClient {
    createWhatsappSession(input: WhatsappSessionRequest): Promise<WhatsappSessionResponse>
    getWhatsappConfig(): Promise<WhatsAppConfig>
    reportWebhookEvents(input: WebhookEventsRequest): Promise<void>
}

function backendTarget(): { baseUrl: string; internalToken: string } {
    const baseUrl = process.env.BACKEND_INTERNAL_URL
    const internalToken = process.env.GATEWAY_INTERNAL_TOKEN

    if (!baseUrl || !internalToken) {
        throw new Error("Backend internal client is not configured")
    }
    return { baseUrl: baseUrl.replace(/\/$/, ""), internalToken }
}

function isNullableString(value: unknown): value is string | null {
    return value === null || typeof value === "string"
}

function toWhatsAppConfig(body: unknown): WhatsAppConfig {
    const data = typeof body === "object" && body !== null ? (body as { data?: unknown }).data : undefined
    const config = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : undefined
    if (
        !config ||
        !isNullableString(config.phoneNumberId) ||
        !isNullableString(config.accessToken) ||
        !isNullableString(config.appSecret) ||
        typeof config.verifyToken !== "string" ||
        config.verifyToken === "" ||
        typeof config.graphApiVersion !== "string" ||
        config.graphApiVersion === ""
    ) {
        throw new Error("Backend returned an invalid WhatsApp config")
    }
    return {
        phoneNumberId: config.phoneNumberId ?? "",
        accessToken: config.accessToken ?? "",
        appSecret: config.appSecret ?? "",
        verifyToken: config.verifyToken,
        graphApiVersion: config.graphApiVersion,
    }
}

export const backendClient: BackendClient = {
    async createWhatsappSession(
        input: WhatsappSessionRequest,
    ): Promise<WhatsappSessionResponse> {
        const { baseUrl, internalToken } = backendTarget()

        const response = await fetch(`${baseUrl}/api/v1/whatsapp/sessions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Internal-Token": internalToken,
            },
            body: JSON.stringify(input),
            signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
        })

        if (!response.ok) {
            throw new Error(`Backend returned HTTP ${response.status}`)
        }

        const { data } = (await response.json()) as { data: WhatsappSessionResponse }
        return data
    },

    async getWhatsappConfig(): Promise<WhatsAppConfig> {
        const { baseUrl, internalToken } = backendTarget()

        const response = await fetch(`${baseUrl}/api/v1/internal/whatsapp/config`, {
            method: "GET",
            headers: { "X-Internal-Token": internalToken },
            signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
        })

        if (!response.ok) {
            throw new Error(`Backend returned HTTP ${response.status}`)
        }

        let body: unknown
        try {
            body = await response.json()
        } catch {
            body = undefined
        }
        return toWhatsAppConfig(body)
    },

    async reportWebhookEvents(input: WebhookEventsRequest): Promise<void> {
        const { baseUrl, internalToken } = backendTarget()

        const response = await fetch(`${baseUrl}/api/v1/internal/whatsapp/events`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Internal-Token": internalToken,
            },
            body: JSON.stringify(input),
            signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
        })

        if (!response.ok) {
            throw new Error(`Backend returned HTTP ${response.status}`)
        }
    },
}
