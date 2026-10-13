import {
    ConversationEventRepository,
    conversationEventRepository,
} from "../repositories/conversationEvent.repository"
import { SessionRepository, sessionRepository } from "../repositories/session.repository"
import type {
    ConversationEvent,
    RecordedConversationEvent,
    SessionClosing,
} from "../types/conversationEvent.types"
import { isConversationEventType } from "../utils/conversationEventData"

export interface ConversationEventService {
    record(sessionId: string, event: ConversationEvent): Promise<void>
    finish(sessionId: string, closing: SessionClosing): Promise<void>
    listBySession(sessionId: string): Promise<RecordedConversationEvent[]>
}

export interface ConversationEventFailureLog {
    type: string
    sessionId: string
    code: string
}

export interface ConversationEventLogger {
    error(message: string, details: ConversationEventFailureLog): void
}

interface ConversationEventDependencies {
    events: ConversationEventRepository
    sessions: Pick<SessionRepository, "finish">
    logger: ConversationEventLogger
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

export function createConversationEventService({
    events,
    sessions,
    logger,
}: ConversationEventDependencies): ConversationEventService {
    return {
        async record(sessionId, event) {
            try {
                await events.record(sessionId, event)
            } catch (error) {
                logger.error(
                    "Failed to record conversation event",
                    conversationEventFailureLog(sessionId, event, error),
                )
            }
        },

        finish: (sessionId, closing) => sessions.finish(sessionId, closing),

        listBySession: (sessionId) => events.listBySession(sessionId),
    }
}

export const conversationEventService = createConversationEventService({
    events: conversationEventRepository,
    sessions: sessionRepository,
    logger: console,
})
