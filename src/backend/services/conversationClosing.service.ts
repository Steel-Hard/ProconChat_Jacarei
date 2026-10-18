import type { SessionClosing } from "../types/conversationEvent.types"
import {
    conversationEventFailureLog,
    ConversationEventLogger,
    ConversationEventService,
} from "./conversationEvent.service"

interface SessionCloserDependencies {
    events: ConversationEventService
    logger: ConversationEventLogger
}

export interface SessionCloser {
    finishOrLog(sessionId: string, closing: SessionClosing): Promise<void>
}

export function createSessionCloser({ events, logger }: SessionCloserDependencies): SessionCloser {
    async function finishOrLog(sessionId: string, closing: SessionClosing): Promise<void> {
        try {
            await events.finish(sessionId, closing)
        } catch (error) {
            logger.error(
                "Failed to finish conversation session",
                conversationEventFailureLog(sessionId, closing.event, error),
            )
        }
    }

    return { finishOrLog }
}
