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
import {
    conversationEventFailureLog,
    ConversationEventLogger,
} from "../utils/conversationEventLog"

export {
    conversationEventFailureLog,
    errorCodeOf,
} from "../utils/conversationEventLog"
export type {
    ConversationEventFailureLog,
    ConversationEventLogger,
} from "../utils/conversationEventLog"

export interface ConversationEventService {
    record(sessionId: string, event: ConversationEvent): Promise<void>
    finish(sessionId: string, closing: SessionClosing): Promise<void>
    listBySession(sessionId: string): Promise<RecordedConversationEvent[]>
}

interface ConversationEventDependencies {
    events: ConversationEventRepository
    sessions: Pick<SessionRepository, "finish">
    logger: ConversationEventLogger
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
