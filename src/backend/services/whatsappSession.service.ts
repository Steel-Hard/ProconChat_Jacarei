import { createHmac } from "crypto"
import { sessionRepository, SessionRepository } from "../repositories/session.repository"

export interface WhatsappSessionInput {
    phone: string
    text?: string
    providerInstance?: string
}

export interface WhatsappSessionResult {
    sessionId: string
    newSession: boolean
}

interface WhatsappSessionDependencies {
    sessions: SessionRepository
}

export function hashPhone(phone: string): string {
    const secret = process.env.PHONE_HASH_SECRET
    if (!secret) {
        throw new Error("PHONE_HASH_SECRET is not configured")
    }

    return createHmac("sha256", secret).update(phone).digest("hex")
}

export function createWhatsappSessionService({
    sessions,
}: WhatsappSessionDependencies): (input: WhatsappSessionInput) => Promise<WhatsappSessionResult> {
    return async ({ phone }: WhatsappSessionInput): Promise<WhatsappSessionResult> => {
        const session = await sessions.findOrCreateActive(hashPhone(phone))
        return { sessionId: session.id, newSession: session.created }
    }
}

export const resolveWhatsappSession = createWhatsappSessionService({ sessions: sessionRepository })
