import { createHmac, timingSafeEqual } from "node:crypto"
import { IgnoredIncoming, MessageProvider, ParsedIncoming } from "./messageProvider"
import { OutgoingMessageValidationError, validateOutgoingMessage } from "./outgoingMessage.validation"
import { IncomingMessage, OutgoingMessage } from "../types/message.types"
import {
    CloudApiConfig,
    CloudApiIncomingMessage,
    CloudApiOutgoingBody,
    CloudApiWebhookPayload,
} from "../types/cloudApi.types"

const SIGNATURE_PATTERN = /^sha256=([0-9a-f]{64})$/i
const SEND_TIMEOUT_MS = 10_000

type FetchFn = (url: string, init: RequestInit) => Promise<Pick<Response, "ok" | "status">>

interface CloudApiProviderDependencies {
    getConfig: () => CloudApiConfig
    fetchFn?: FetchFn
}

function parseTimestampMs(raw: string | number | undefined): number | undefined {
    if (raw === undefined || raw === null || raw === "") {
        return undefined
    }
    const seconds = Number(raw)
    return Number.isFinite(seconds) ? seconds * 1000 : undefined
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

function isIgnored(value: IncomingMessage | IgnoredIncoming): value is IgnoredIncoming {
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

export function createCloudApiProvider({
    getConfig,
    fetchFn = (url, init) => fetch(url, init),
}: CloudApiProviderDependencies): MessageProvider {
    return {
        verifySignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
            const match = signatureHeader ? SIGNATURE_PATTERN.exec(signatureHeader) : null
            if (!match?.[1]) {
                return false
            }

            const received = Buffer.from(match[1], "hex")
            const expected = createHmac("sha256", getConfig().appSecret).update(rawBody).digest()
            if (received.length !== expected.length) {
                return false
            }
            return timingSafeEqual(received, expected)
        },

        parseIncoming(payload: unknown): ParsedIncoming {
            const result: ParsedIncoming = { messages: [], ignored: [] }
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

                    const statuses = Array.isArray(value.statuses) ? value.statuses : []
                    for (const status of statuses) {
                        result.ignored.push(
                            status?.id
                                ? { reason: "status_update", messageId: status.id }
                                : { reason: "status_update" },
                        )
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

            const { phoneNumberId, accessToken, graphApiVersion } = getConfig()
            const response = await fetchFn(
                `https://graph.facebook.com/${encodeURIComponent(graphApiVersion)}/${encodeURIComponent(phoneNumberId)}/messages`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify(buildBody(to, message)),
                    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
                },
            )

            if (!response.ok) {
                throw new Error(`Cloud API returned HTTP ${response.status}`)
            }
        },
    }
}
