import { createHmac, timingSafeEqual } from "node:crypto"
import { IgnoredIncoming, MessageProvider, ParsedIncoming } from "./messageProvider"
import { OutgoingMessageValidationError, validateOutgoingMessage } from "./outgoingMessage.validation"
import { DeliveryStatus, DeliveryStatusValue, IncomingMessage, OutgoingMessage, OutgoingTemplate } from "../types/message.types"
import {
    CloudApiConfig,
    CloudApiIncomingMessage,
    CloudApiOutgoingBody,
    CloudApiStatus,
    CloudApiTemplateBody,
    CloudApiWebhookPayload,
} from "../types/cloudApi.types"
import { whatsappConfigStore } from "../services/whatsappConfigStore"

const SIGNATURE_PATTERN = /^sha256=([0-9a-f]{64})$/i
const SEND_TIMEOUT_MS = 10_000
const PROVIDER_MESSAGE_ID_MAX = 128
const DELIVERY_STATUSES: readonly string[] = ["sent", "delivered", "read", "failed"]

type FetchFn = (url: string, init: RequestInit) => Promise<Pick<Response, "ok" | "status" | "json">>

interface CloudApiProviderDependencies {
    getConfig: () => CloudApiConfig
    fetchFn?: FetchFn
}

function parseTimestampSeconds(raw: string | number | undefined): number | null {
    if (raw === undefined || raw === null || raw === "") {
        return null
    }
    const seconds = Number(raw)
    return Number.isFinite(seconds) ? seconds : null
}

function parseTimestampMs(raw: string | number | undefined): number | undefined {
    const seconds = parseTimestampSeconds(raw)
    return seconds === null ? undefined : seconds * 1000
}

function readOptionId(message: CloudApiIncomingMessage): string | undefined {
    const interactive = message.interactive
    if (message.type !== "interactive" || !interactive) {
        return undefined
    }
    const id =
        interactive.type === "list_reply"
            ? interactive.list_reply?.id
            : interactive.type === "button_reply"
              ? interactive.button_reply?.id
              : undefined
    return id && id.trim() !== "" ? id : undefined
}

function readText(message: CloudApiIncomingMessage): string | undefined {
    if (message.type !== "text") {
        return undefined
    }
    const text = message.text?.body?.trim()
    return text ? text : undefined
}

function toIncoming(message: CloudApiIncomingMessage): IncomingMessage | IgnoredIncoming {
    if (!message.id) {
        return { reason: "missing_message_id" }
    }
    if (!message.from) {
        return { reason: "missing_phone", messageId: message.id }
    }

    const text = readText(message)
    const optionId = readOptionId(message)
    if (!text && !optionId) {
        return { reason: "unsupported_message", messageId: message.id }
    }

    const incoming: IncomingMessage = { id: message.id, from: message.from }
    const timestampMs = parseTimestampMs(message.timestamp)
    if (timestampMs !== undefined) {
        incoming.timestampMs = timestampMs
    }
    if (text) {
        incoming.text = text
    } else {
        incoming.optionId = optionId
    }
    return incoming
}

function readErrorCode(status: CloudApiStatus): string | null {
    const code = Array.isArray(status.errors) ? status.errors[0]?.code : undefined
    return code === undefined || code === null ? null : String(code)
}

function toDeliveryStatus(status: CloudApiStatus): DeliveryStatus | IgnoredIncoming {
    const id = status.id
    if (!id || id.length > PROVIDER_MESSAGE_ID_MAX) {
        return { reason: "unsupported_status" }
    }
    if (status.status === undefined || !DELIVERY_STATUSES.includes(status.status)) {
        return { reason: "unsupported_status", messageId: id }
    }
    return {
        providerMessageId: id,
        status: status.status as DeliveryStatusValue,
        timestamp: parseTimestampSeconds(status.timestamp),
        errorCode: readErrorCode(status),
    }
}

function isIgnored<T extends object>(value: T | IgnoredIncoming): value is IgnoredIncoming {
    return "reason" in value
}

function buildBody(to: string, message: OutgoingMessage): CloudApiOutgoingBody {
    const base = { messaging_product: "whatsapp", recipient_type: "individual", to } as const

    switch (message.type) {
        case "text":
            return { ...base, type: "text", text: { body: message.text, preview_url: false } }
        case "list":
            return {
                ...base,
                type: "interactive",
                interactive: {
                    type: "list",
                    body: { text: message.text },
                    ...(message.footer === undefined ? {} : { footer: { text: message.footer } }),
                    action: {
                        button: message.buttonText,
                        sections: [
                            {
                                rows: message.rows.map((row) =>
                                    row.description === undefined
                                        ? { id: row.id, title: row.title }
                                        : { id: row.id, title: row.title, description: row.description },
                                ),
                            },
                        ],
                    },
                },
            }
        case "buttons":
            return {
                ...base,
                type: "interactive",
                interactive: {
                    type: "button",
                    body: { text: message.text },
                    ...(message.footer === undefined ? {} : { footer: { text: message.footer } }),
                    action: {
                        buttons: message.buttons.map((button) => ({
                            type: "reply",
                            reply: { id: button.id, title: button.title },
                        })),
                    },
                },
            }
    }
}

async function readProviderMessageId(response: Pick<Response, "json">): Promise<string | null> {
    try {
        const payload = (await response.json()) as { messages?: { id?: unknown }[] }
        const id = payload?.messages?.[0]?.id
        return typeof id === "string" && id !== "" ? id : null
    } catch {
        return null
    }
}

function buildTemplateBody(to: string, template: OutgoingTemplate): CloudApiTemplateBody {
    return {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "template",
        template: {
            name: template.name,
            language: { code: template.languageCode },
            components: [
                {
                    type: "body",
                    parameters: template.bodyParameters.map((text) => ({ type: "text", text })),
                },
            ],
        },
    }
}

export function createCloudApiProvider({
    getConfig,
    fetchFn = (url, init) => fetch(url, init),
}: CloudApiProviderDependencies): MessageProvider {
    async function postMessage(body: CloudApiOutgoingBody | CloudApiTemplateBody): Promise<Pick<Response, "json">> {
        const { phoneNumberId, accessToken, graphApiVersion } = getConfig()
        const response = await fetchFn(
            `https://graph.facebook.com/${encodeURIComponent(graphApiVersion)}/${encodeURIComponent(phoneNumberId)}/messages`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
            },
        )

        if (!response.ok) {
            throw new Error(`Cloud API returned HTTP ${response.status}`)
        }
        return response
    }

    return {
        verifySignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
            const match = signatureHeader ? SIGNATURE_PATTERN.exec(signatureHeader) : null
            if (!match?.[1]) {
                return false
            }

            const { appSecret } = getConfig()
            if (!appSecret) {
                return false
            }

            const received = Buffer.from(match[1], "hex")
            const expected = createHmac("sha256", appSecret).update(rawBody).digest()
            if (received.length !== expected.length) {
                return false
            }
            return timingSafeEqual(received, expected)
        },

        parseIncoming(payload: unknown): ParsedIncoming {
            const result: ParsedIncoming = { messages: [], statuses: [], ignored: [], eventReceived: false }
            const webhook = (payload ?? {}) as CloudApiWebhookPayload

            if (webhook.object !== "whatsapp_business_account") {
                result.ignored.push({ reason: "unsupported_object" })
                return result
            }

            const { phoneNumberId } = getConfig()
            const entries = Array.isArray(webhook.entry) ? webhook.entry : []

            for (const entry of entries) {
                const changes = Array.isArray(entry?.changes) ? entry.changes : []
                for (const change of changes) {
                    if (change?.field !== "messages") {
                        result.ignored.push({ reason: "unsupported_field" })
                        continue
                    }

                    const value = change.value
                    if (value?.metadata?.phone_number_id !== phoneNumberId) {
                        result.ignored.push({ reason: "unknown_phone_number_id" })
                        continue
                    }

                    result.eventReceived = true

                    const statuses = Array.isArray(value.statuses) ? value.statuses : []
                    for (const status of statuses) {
                        const parsed = toDeliveryStatus(status ?? {})
                        if (isIgnored(parsed)) {
                            result.ignored.push(parsed)
                        } else {
                            result.statuses.push(parsed)
                        }
                    }

                    const messages = Array.isArray(value.messages) ? value.messages : []
                    for (const message of messages) {
                        const parsed = toIncoming(message ?? {})
                        if (isIgnored(parsed)) {
                            result.ignored.push(parsed)
                        } else {
                            result.messages.push(parsed)
                        }
                    }
                }
            }

            return result
        },

        async send(to: string, message: OutgoingMessage): Promise<void> {
            const validation = validateOutgoingMessage(message)
            if (!validation.ok) {
                throw new OutgoingMessageValidationError(validation.reason)
            }

            await postMessage(buildBody(to, message))
        },

        async sendTemplate(to: string, template: OutgoingTemplate): Promise<{ providerMessageId: string | null }> {
            const response = await postMessage(buildTemplateBody(to, template))
            return { providerMessageId: await readProviderMessageId(response) }
        },
    }
}

export const cloudApiProvider = createCloudApiProvider({ getConfig: () => whatsappConfigStore.current() })
