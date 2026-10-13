import type { ConversationEvent, RecordedConversationEvent } from "../types/conversationEvent.types"
import { buildConversationEventRow, validateConversationEvent } from "../utils/conversationEventData"
import type { ConversationEventRepository } from "./conversationEvent.repository"

export interface ConversationEventRepositoryCall {
    method: "record" | "listBySession"
    args: unknown[]
}

export class MockConversationEventRepository implements ConversationEventRepository {
    public readonly calls: ConversationEventRepositoryCall[] = []

    private readonly stored: Array<{ sessionId: string; event: RecordedConversationEvent }> = []

    private failure: Error | null = null

    failWith(error: Error | null): void {
        this.failure = error
    }

    async record(sessionId: string, event: ConversationEvent): Promise<void> {
        this.calls.push({ method: "record", args: [sessionId, event] })

        if (this.failure) {
            throw this.failure
        }

        buildConversationEventRow(sessionId, event)
        this.stored.push({
            sessionId,
            event: { ...validateConversationEvent(event), createdAt: new Date() },
        })
    }

    async listBySession(sessionId: string): Promise<RecordedConversationEvent[]> {
        this.calls.push({ method: "listBySession", args: [sessionId] })

        if (this.failure) {
            throw this.failure
        }

        return this.stored.filter((item) => item.sessionId === sessionId).map((item) => item.event)
    }
}
