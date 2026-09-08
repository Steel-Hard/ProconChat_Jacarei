import { evolutionGateway, MessageGateway } from "../gateways/evolution.gateway"
import { backendClient, BackendClient } from "../clients/backend.client"
import { EvolutionWebhookPayload, EvolutionWebhookResult } from "../types/evolution.types"

interface EvolutionWebhookDependencies {
    backend: BackendClient
    messages: MessageGateway
}

function isMessageUpsert(event?: string): boolean {
    return event?.toLowerCase().replace(/_/g, ".") === "messages.upsert"
}

function getWhatsappJid(payload: EvolutionWebhookPayload): string | undefined {
    const key = payload.data?.key
    return [key?.remoteJidAlt, key?.remoteJid].find((jid) => jid?.endsWith("@s.whatsapp.net"))
}

function getMessageText(payload: EvolutionWebhookPayload): string | undefined {
    const message = payload.data?.message
    return (
        message?.conversation ??
        message?.extendedTextMessage?.text ??
        message?.imageMessage?.caption
    )?.trim()
}

export function createEvolutionWebhookService({
    backend,
    messages,
}: EvolutionWebhookDependencies): (payload: EvolutionWebhookPayload) => Promise<EvolutionWebhookResult> {
    return async (payload: EvolutionWebhookPayload): Promise<EvolutionWebhookResult> => {
        if (!isMessageUpsert(payload.event)) {
            return { status: "ignored", reason: "unsupported_event" }
        }
        if (payload.data?.key?.fromMe) {
            return { status: "ignored", reason: "outgoing_message" }
        }

        const jid = getWhatsappJid(payload)
        if (!jid) {
            return { status: "ignored", reason: "unsupported_chat" }
        }

        const text = getMessageText(payload)
        if (!text) {
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
}

export const processEvolutionWebhook = createEvolutionWebhookService({
    backend: backendClient,
    messages: evolutionGateway,
})
