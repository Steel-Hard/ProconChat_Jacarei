import type { PoolClient } from "pg"
import getPool from "../db/connection"
import type {
    ConversationEvent,
    RecordedConversationEvent,
    StoredConversationEventRow,
} from "../types/conversationEvent.types"
import { buildConversationEventRow, parseConversationEventRow } from "../utils/conversationEventData"
import { conversationEventFailureLog, ConversationEventLogger } from "../utils/conversationEventLog"

export type Queryable = Pick<PoolClient, "query">

export interface ConversationEventRepository {
    record(sessionId: string, event: ConversationEvent, occurredAt?: Date): Promise<void>
    listBySession(sessionId: string): Promise<RecordedConversationEvent[]>
}

interface ConversationEventRepositoryDependencies {
    logger: ConversationEventLogger
}

export async function insertConversationEvent(
    db: Queryable,
    sessionId: string,
    event: ConversationEvent,
    occurredAt?: Date,
): Promise<void> {
    const row = buildConversationEventRow(sessionId, event)
    const values = [
        row.sessionId,
        row.type,
        row.categoryId,
        row.questionId,
        row.appointmentId,
        JSON.stringify(row.data),
    ]

    if (occurredAt === undefined) {
        await db.query(
            `INSERT INTO ConversationEvents
                (session_id, type, category_id, question_id, appointment_id, data)
             VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
            values,
        )
        return
    }

    await db.query(
        `INSERT INTO ConversationEvents
            (session_id, type, category_id, question_id, appointment_id, data, created_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
        [...values, occurredAt],
    )
}

export function createConversationEventRepository({
    logger,
}: ConversationEventRepositoryDependencies): ConversationEventRepository {
    return {
        async record(sessionId, event, occurredAt): Promise<void> {
            await insertConversationEvent(getPool(), sessionId, event, occurredAt)
        },

        async listBySession(sessionId): Promise<RecordedConversationEvent[]> {
            const result = await getPool().query<StoredConversationEventRow>(
                `SELECT type, category_id, question_id, appointment_id, data, created_at
                 FROM ConversationEvents
                 WHERE session_id = $1
                 ORDER BY created_at, id`,
                [sessionId],
            )

            return result.rows.flatMap((row) => {
                try {
                    return [parseConversationEventRow(row)]
                } catch (error) {
                    logger.error(
                        "Discarded conversation event outside the contract",
                        conversationEventFailureLog(sessionId, row, error),
                    )
                    return []
                }
            })
        },
    }
}

export const conversationEventRepository = createConversationEventRepository({ logger: console })
