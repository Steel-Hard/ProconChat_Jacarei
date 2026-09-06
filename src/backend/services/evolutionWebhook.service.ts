import { createHmac } from "crypto"
import { evolutionGateway, MessageGateway } from "../gateways/evolution.gateway"
import { sessionRepository, SessionRepository } from "../repositories/session.repository"
import { EvolutionWebhookPayload, EvolutionWebhookResult } from "../types/evolution.types"

interface EvolutionWebhookDependencies {
    sessions: SessionRepository
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

function hashPhone(jid: string): string {
    const secret = process.env.PHONE_HASH_SECRET
    if (!secret) {
        throw new Error("PHONE_HASH_SECRET is not configured")
    }

    return createHmac("sha256", secret).update(jid.split("@")[0] ?? jid).digest("hex")
}

export function createEvolutionWebhookService({
    sessions,
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
        if (!getMessageText(payload)) {
            return { status: "ignored", reason: "unsupported_message" }
        }

        const session = await sessions.findOrCreateActive(hashPhone(jid))

        if (session.created && process.env.EVOLUTION_AUTO_REPLY_ENABLED === "true") {
            if (!payload.instance) {
                throw new Error("Evolution webhook did not include an instance")
            }

            await messages.sendText({
                instance: payload.instance,
                number: jid.split("@")[0] ?? jid,
                text: "Ola! Sou o assistente virtual do Procon Jacarei. Como posso orientar voce?",
            })
        }

        return { status: "processed", sessionId: session.id, newSession: session.created }
    }
}

export const processEvolutionWebhook = createEvolutionWebhookService({
    sessions: sessionRepository,
    messages: evolutionGateway,
})
