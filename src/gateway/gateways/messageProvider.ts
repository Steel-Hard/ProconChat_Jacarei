import { IncomingMessage, OutgoingMessage, OutgoingTemplate } from "../types/message.types"

export interface IgnoredIncoming {
    reason: string
    messageId?: string
}

export interface ParsedIncoming {
    messages: IncomingMessage[]
    ignored: IgnoredIncoming[]
}

export interface MessageProvider {
    verifySignature(rawBody: Buffer, signatureHeader: string | undefined): boolean
    parseIncoming(payload: unknown): ParsedIncoming
    send(to: string, message: OutgoingMessage): Promise<void>
    sendTemplate(to: string, template: OutgoingTemplate): Promise<{ providerMessageId: string | null }>
}
