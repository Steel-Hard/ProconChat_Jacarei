import type { PoolClient } from "pg"
import getPool from "../db/connection"
import type {
    ConversationEvent,
    RecordedConversationEvent,
    StoredConversationEventRow,
} from "../types/conversationEvent.types"
import { buildConversationEventRow, parseConversationEventRow } from "../utils/conversationEventData"

export type Queryable = Pick<PoolClient, "query">

export interface ConversationEventRepository {
    record(sessionId: string, event: ConversationEvent): Promise<void>
    listBySession(sessionId: string): Promise<RecordedConversationEvent[]>
}

export async function insertConversationEvent(
    db: Queryable,
    sessionId: string,
    event: ConversationEvent,
): Promise<void> {
    const row = buildConversationEventRow(sessionId, event)

    await db.query(
        `INSERT INTO ConversationEvents
            (session_id, type, category_id, question_id, appointment_id, data)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
        [
            row.sessionId,
            row.type,
            row.categoryId,
            row.questionId,
            row.appointmentId,
            JSON.stringify(row.data),
        ],
    )
}

export const conversationEventRepository: ConversationEventRepository = {
    async record(sessionId, event): Promise<void> {
        await insertConversationEvent(getPool(), sessionId, event)
    },

    async listBySession(sessionId): Promise<RecordedConversationEvent[]> {
        const result = await getPool().query<StoredConversationEventRow>(
            `SELECT type, category_id, question_id, appointment_id, data, created_at
             FROM ConversationEvents
             WHERE session_id = $1
             ORDER BY created_at, id`,
            [sessionId],
        )

        return result.rows.map(parseConversationEventRow)
    },
}
