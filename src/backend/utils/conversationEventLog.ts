import { isConversationEventType } from "./conversationEventData"

export interface ConversationEventFailureLog {
    type: string
    sessionId: string
    code: string
}

export interface ConversationEventLogger {
    error(message: string, details: ConversationEventFailureLog): void
}

function eventTypeOf(event: unknown): string {
    const type = typeof event === "object" && event !== null ? (event as { type?: unknown }).type : undefined
    return isConversationEventType(type) ? type : "INVALID"
}

function sessionIdOf(sessionId: unknown): string {
    return typeof sessionId === "string" && /^\d{1,19}$/.test(sessionId) ? sessionId : "INVALID"
}

export function errorCodeOf(error: unknown): string {
    const code = typeof error === "object" && error !== null ? (error as { code?: unknown }).code : undefined
    return typeof code === "string" && /^[A-Z0-9_]{1,40}$/.test(code) ? code : "UNKNOWN"
}

export function conversationEventFailureLog(
    sessionId: unknown,
    event: unknown,
    error: unknown,
): ConversationEventFailureLog {
    return { type: eventTypeOf(event), sessionId: sessionIdOf(sessionId), code: errorCodeOf(error) }
}
