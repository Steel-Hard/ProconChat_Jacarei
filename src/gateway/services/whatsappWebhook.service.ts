import { backendClient, BackendClient, WhatsappSessionRequest, WhatsappSessionResponse } from "../clients/backend.client"
import { cloudApiProvider } from "../gateways/cloudApi.gateway"
import { MessageProvider } from "../gateways/messageProvider"
import { OutgoingMessageValidationError } from "../gateways/outgoingMessage.validation"
import { IncomingMessage, OutgoingMessage } from "../types/message.types"
import { WhatsappMessageResult, WhatsappWebhookResult } from "../types/whatsappWebhook.types"
import { MemoryMessageDeduplicator, MessageDeduplicator } from "./messageDeduplicator"
import { createPhoneQueue, PhoneQueue } from "./phoneQueue"
import { messageRef } from "../utils/messageRef"

const MESSAGE_MAX_AGE_MS = 300_000

interface WhatsappWebhookDependencies {
    backend: BackendClient
    provider: MessageProvider
    deduplicator: MessageDeduplicator
    queue: PhoneQueue
    maxAgeMs?: number
    now?: () => number
}

function log(reason: string, messageId?: string, detail?: string): void {
    console.log(
        JSON.stringify({
            event: "whatsapp_cloud_api",
            reason,
            messageRef: messageId === undefined ? undefined : messageRef(messageId),
            detail,
            timestamp: new Date().toISOString(),
        }),
    )
}

function toRequest(message: IncomingMessage): WhatsappSessionRequest {
    return message.text !== undefined
        ? { phone: message.from, text: message.text }
        : { phone: message.from, optionId: message.optionId }
}

function toOutgoing(reply: WhatsappSessionResponse["reply"]): OutgoingMessage[] {
    if (reply?.messages && reply.messages.length > 0) {
        return reply.messages
    }
    if (reply?.text && reply.text.trim() !== "") {
        return [{ type: "text", text: reply.text }]
    }
    return []
}

async function sendReply(
    provider: MessageProvider,
    to: string,
    outgoing: OutgoingMessage[],
    messageId: string,
): Promise<void> {
    for (const message of outgoing) {
        try {
            await provider.send(to, message)
        } catch (error) {
            if (error instanceof OutgoingMessageValidationError) {
                log("invalid_outgoing_message", messageId, error.reason)
            } else {
                log("send_failed", messageId, error instanceof Error ? error.message : undefined)
            }
            return
        }
    }
}

export function createWhatsappWebhookService({
    backend,
    provider,
    deduplicator,
    queue,
    maxAgeMs = MESSAGE_MAX_AGE_MS,
    now = Date.now,
}: WhatsappWebhookDependencies): (payload: unknown) => Promise<WhatsappWebhookResult> {
    async function processMessage(message: IncomingMessage): Promise<WhatsappMessageResult> {
        if (deduplicator.isDuplicate(message.id)) {
            log("duplicate_message", message.id)
            return { status: "ignored", reason: "duplicate_message", messageId: message.id }
        }

        if (message.timestampMs !== undefined && now() - message.timestampMs > maxAgeMs) {
            log("stale_message", message.id)
            return { status: "ignored", reason: "stale_message", messageId: message.id }
        }

        await queue.run(message.from, async () => {
            let session: WhatsappSessionResponse
            try {
                session = await backend.createWhatsappSession(toRequest(message))
            } catch (error) {
                deduplicator.forget?.(message.id)
                throw error
            }
            await sendReply(provider, message.from, toOutgoing(session.reply), message.id)
        })

        return { status: "processed", messageId: message.id }
    }

    return async (payload: unknown): Promise<WhatsappWebhookResult> => {
        const { messages, ignored } = provider.parseIncoming(payload)
        const results: WhatsappMessageResult[] = ignored.map(({ reason, messageId }) => {
            log(reason, messageId)
            return messageId === undefined
                ? { status: "ignored", reason }
                : { status: "ignored", reason, messageId }
        })

        for (const message of messages) {
            results.push(await processMessage(message))
        }

        return { results }
    }
}

export const whatsappDeduplicator = new MemoryMessageDeduplicator(MESSAGE_MAX_AGE_MS)

export const processWhatsappWebhook = createWhatsappWebhookService({
    backend: backendClient,
    provider: cloudApiProvider,
    deduplicator: whatsappDeduplicator,
    queue: createPhoneQueue(),
})
