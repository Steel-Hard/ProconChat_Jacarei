export interface EvolutionMessageKey {
    remoteJid?: string
    remoteJidAlt?: string
    fromMe?: boolean
    id?: string
}

export interface EvolutionMessageContent {
    conversation?: string
    extendedTextMessage?: { text?: string }
    imageMessage?: { caption?: string }
}

export interface EvolutionMessageEnvelope {
    key?: EvolutionMessageKey
    message?: EvolutionMessageContent
    pushName?: string
    messageTimestamp?: number | string
}

export interface EvolutionWebhookPayload {
    event?: string
    instance?: string
    data?: EvolutionMessageEnvelope & {
        messages?: EvolutionMessageEnvelope[]
    }
}

export type EvolutionWebhookResult =
    | { status: "ignored"; reason: string }
    | {
          status: "processed"
          sessionId: string
          newSession: boolean
          reply: { text: string; step: string }
      }
