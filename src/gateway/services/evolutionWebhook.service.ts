import { evolutionGateway, MessageGateway } from "../gateways/evolution.gateway"
import { backendClient, BackendClient } from "../clients/backend.client"
import {
    EvolutionMessageEnvelope,
    EvolutionWebhookPayload,
    EvolutionWebhookResult,
} from "../types/evolution.types"

const SUPPORTED_MESSAGE_EVENTS = [
    "messages.upsert",
    "messages.update",
    "messages.edited",
    "messages.set",
]

const DEFAULT_MESSAGE_MAX_AGE_SECONDS = 300
const MIN_DEDUPLICATOR_TTL_MS = getMessageMaxAgeMs()

export class MemoryMessageDeduplicator {
    private readonly cache = new Map<string, number>()
    private readonly ttlMs: number

    constructor(ttlMs = MIN_DEDUPLICATOR_TTL_MS) {
        this.ttlMs = ttlMs
    }

    isDuplicate(id: string): boolean {
        const now = Date.now()
        const timestamp = this.cache.get(id)
        if (timestamp && now - timestamp < this.ttlMs) {
            return true
        }
        this.cache.set(id, now)

        if (this.cache.size > 1000) {
            for (const [key, time] of this.cache.entries()) {
                if (now - time >= this.ttlMs) {
                    this.cache.delete(key)
                }
            }
        }
        return false
    }

    clear(): void {
        this.cache.clear()
    }
}

export const defaultMessageDeduplicator = new MemoryMessageDeduplicator()

export interface MessageDeduplicator {
    isDuplicate(id: string): boolean
    clear?(): void
}

interface EvolutionWebhookDependencies {
    backend: BackendClient
    messages: MessageGateway
    deduplicator?: MessageDeduplicator
}

function normalizeEventName(event?: string): string | undefined {
    return event?.toLowerCase().replace(/_/g, ".")
}

function isSupportedMessageEvent(event?: string): boolean {
    const normalized = normalizeEventName(event)
    return normalized !== undefined && SUPPORTED_MESSAGE_EVENTS.includes(normalized)
}

function getMessageMaxAgeMs(): number {
    const raw = process.env.EVOLUTION_MESSAGE_MAX_AGE_SECONDS
    if (raw === undefined || raw === "") {
        return DEFAULT_MESSAGE_MAX_AGE_SECONDS * 1000
    }

    const seconds = Number(raw)
    if (!Number.isFinite(seconds) || seconds <= 0) {
        return Number.POSITIVE_INFINITY
    }

    return seconds * 1000
}

function getEnvelopeJid(envelope: EvolutionMessageEnvelope): string | undefined {
    const key = envelope.key
    return [key?.remoteJidAlt, key?.remoteJid].find((jid) => jid?.endsWith("@s.whatsapp.net"))
}

function getEnvelopeText(envelope: EvolutionMessageEnvelope): string | undefined {
    const message = envelope.message
    return (
        message?.conversation ??
        message?.extendedTextMessage?.text ??
        message?.imageMessage?.caption
    )?.trim()
}

function getCandidateEnvelopes(payload: EvolutionWebhookPayload): EvolutionMessageEnvelope[] {
    const data = payload.data
    if (!data) {
        return []
    }
    if (Array.isArray(data.messages)) {
        return data.messages
    }
    return [data]
}

function parseMessageTimestampMs(envelope: EvolutionMessageEnvelope): number | undefined {
    const raw = envelope.messageTimestamp
    if (raw === undefined || raw === null) {
        return undefined
    }

    const seconds = Number(raw)
    if (!Number.isFinite(seconds)) {
        return undefined
    }

    return seconds * 1000
}

function isStaleMessage(envelope: EvolutionMessageEnvelope, maxAgeMs: number): boolean {
    const timestampMs = parseMessageTimestampMs(envelope)
    if (timestampMs === undefined) {
        return false
    }
    return Date.now() - timestampMs > maxAgeMs
}

function logIgnored(event: string | undefined, reason: string, messageId?: string): void {
    console.log(
        JSON.stringify({
            event,
            reason,
            messageId,
            timestamp: new Date().toISOString(),
        }),
    )
}

async function processEnvelope(
    envelope: EvolutionMessageEnvelope,
    payload: EvolutionWebhookPayload,
    { backend, messages, deduplicator }: Required<EvolutionWebhookDependencies>,
    maxAgeMs: number,
): Promise<EvolutionWebhookResult> {
    const event = payload.event

    if (envelope.key?.fromMe) {
        logIgnored(event, "outgoing_message", envelope.key?.id)
        return { status: "ignored", reason: "outgoing_message" }
    }

    const messageId = envelope.key?.id
    if (!messageId) {
        logIgnored(event, "missing_message_id")
        return { status: "ignored", reason: "missing_message_id" }
    }

    if (deduplicator.isDuplicate(messageId)) {
        logIgnored(event, "duplicate_message", messageId)
        return { status: "ignored", reason: "duplicate_message" }
    }

    if (isStaleMessage(envelope, maxAgeMs)) {
        logIgnored(event, "stale_message", messageId)
        return { status: "ignored", reason: "stale_message" }
    }

    const jid = getEnvelopeJid(envelope)
    if (!jid) {
        logIgnored(event, "unsupported_chat", messageId)
        return { status: "ignored", reason: "unsupported_chat" }
    }

    const text = getEnvelopeText(envelope)
    if (!text) {
        logIgnored(event, "unsupported_message", messageId)
        return { status: "ignored", reason: "unsupported_message" }
    }

    const phone = jid.split("@")[0] ?? jid
    const session = await backend.createWhatsappSession({
        phone,
        text,
        providerInstance: payload.instance,
    })

    if (session.reply?.text && process.env.EVOLUTION_AUTO_REPLY_ENABLED === "true") {
        if (!payload.instance) {
            throw new Error("Evolution webhook did not include an instance")
        }

        await messages.sendText({
            instance: payload.instance,
            number: phone,
            text: session.reply.text,
        })
    }

    return {
        status: "processed",
        sessionId: session.sessionId,
        newSession: session.newSession,
        reply: session.reply,
    }
}

export function createEvolutionWebhookService({
    backend,
    messages,
    deduplicator = defaultMessageDeduplicator,
}: EvolutionWebhookDependencies): (payload: EvolutionWebhookPayload) => Promise<EvolutionWebhookResult> {
    return async (payload: EvolutionWebhookPayload): Promise<EvolutionWebhookResult> => {
        const event = payload.event

        if (!isSupportedMessageEvent(event)) {
            logIgnored(event, "unsupported_event", payload.data?.key?.id)
            return { status: "ignored", reason: "unsupported_event" }
        }

        const maxAgeMs = getMessageMaxAgeMs()
        const envelopes = getCandidateEnvelopes(payload)

        if (envelopes.length === 0) {
            logIgnored(event, "unsupported_message")
            return { status: "ignored", reason: "unsupported_message" }
        }

        let result: EvolutionWebhookResult = { status: "ignored", reason: "unsupported_message" }
        for (const envelope of envelopes) {
            result = await processEnvelope(envelope, payload, { backend, messages, deduplicator }, maxAgeMs)
        }
        return result
    }
}

export const processEvolutionWebhook = createEvolutionWebhookService({
    backend: backendClient,
    messages: evolutionGateway,
})
