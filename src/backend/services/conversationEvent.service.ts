import {
    ConversationEventRepository,
    conversationEventRepository,
} from "../repositories/conversationEvent.repository"
import type { ConversationEvent } from "../types/conversationEvent.types"

export interface ConversationEventService {
    record(sessionId: string, event: ConversationEvent): Promise<void>
}

export function createConversationEventService(
    repository: ConversationEventRepository,
): ConversationEventService {
    return {
        record: (sessionId, event) => repository.record(sessionId, event),
    }
}

export const conversationEventService = createConversationEventService(conversationEventRepository)
