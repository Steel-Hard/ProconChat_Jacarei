import getPool from "../db/connection"
import InternalServerError from "../errors/InternalServerError"
import type { SessionClosing } from "../types/conversationEvent.types"
import { isClosingCompatible } from "../utils/conversationEventData"
import { insertConversationEvent, Queryable } from "./conversationEvent.repository"

export type SessionStep =
    | "AWAITING_CATEGORY"
    | "AWAITING_QUESTION"
    | "AWAITING_ANSWER"
    | "AWAITING_RESOLVED"
    | "AWAITING_SCHEDULE_OFFER"
    | "AWAITING_ATTENDEE"
    | "AWAITING_HOLDER_NAME"
    | "AWAITING_HOLDER_CPF"
    | "AWAITING_SLOT"
    | "AWAITING_RETURN_CHOICE"
    | "AWAITING_CANCEL_CONFIRMATION"
    | "FINISHED"

export type SessionOutcome =
    | "IN_PROGRESS"
    | "RESOLVED"
    | "SCHEDULED"
    | "OUT_OF_SCOPE"
    | "NO_SLOT"
    | "DECLINED"
    | "MANAGED_APPOINTMENT"
    | "ABANDONED"

export interface ActiveSession {
    id: string
    created: boolean
    currentStep: SessionStep
    currentCategoryId: string | null
}

export interface NavigationState {
    currentStep: SessionStep
    currentCategoryId: string | null
}

export interface SessionRepository {
    findOrCreateActive(phoneHash: string): Promise<ActiveSession>
    updateNavigationState(sessionId: string, state: NavigationState): Promise<void>
    touch(sessionId: string): Promise<void>
    finish(sessionId: string, closing: SessionClosing): Promise<void>
}

export async function finishSessionWith(
    db: Queryable,
    sessionId: string,
    closing: SessionClosing,
): Promise<void> {
    if (!isClosingCompatible(closing)) {
        throw new InternalServerError("Closing event does not match the session outcome")
    }

    await insertConversationEvent(db, sessionId, closing.event)

    const result = await db.query(
        `UPDATE Sessions
         SET status = 'FINISHED', outcome = $2, ended_at = now(),
             last_interaction_at = now(), current_step = 'FINISHED', draft = NULL
         WHERE id = $1 AND status = 'IN_PROGRESS'`,
        [sessionId, closing.outcome],
    )
    if (result.rowCount !== 1) {
        throw new Error("Conversation session was changed or finished")
    }
}

export const sessionRepository: SessionRepository = {
    async findOrCreateActive(phoneHash: string): Promise<ActiveSession> {
        const client = await getPool().connect()
        try {
            await client.query("BEGIN")
            await client.query(
                `WITH stale AS (
                    SELECT id, current_step, last_interaction_at
                    FROM Sessions
                    WHERE phone_hash = $1
                      AND status = 'IN_PROGRESS'
                      AND last_interaction_at <= now() - interval '30 minutes'
                    FOR UPDATE
                ),
                abandoned AS (
                    UPDATE Sessions AS session
                    SET status = 'ABANDONED',
                        outcome = 'ABANDONED',
                        abandoned_at_step = stale.current_step,
                        ended_at = stale.last_interaction_at + interval '30 minutes',
                        current_step = 'FINISHED',
                        draft = NULL
                    FROM stale
                    WHERE session.id = stale.id
                    RETURNING session.id, stale.current_step
                )
                INSERT INTO ConversationEvents (session_id, type, data)
                SELECT id, 'ABANDONED', jsonb_build_object('step', current_step)
                FROM abandoned`,
                [phoneHash],
            )

            const inserted = await client.query<{
                id: string
                current_step: SessionStep
                current_category_id: string | null
            }>(
                `INSERT INTO Sessions (phone_hash)
                 VALUES ($1)
                 ON CONFLICT (phone_hash) WHERE status = 'IN_PROGRESS' DO NOTHING
                 RETURNING id, current_step, current_category_id`,
                [phoneHash],
            )

            const created = inserted.rows[0]
            if (created) {
                await insertConversationEvent(client, created.id, { type: "STARTED" })
                await client.query("COMMIT")
                return {
                    id: created.id,
                    created: true,
                    currentStep: created.current_step,
                    currentCategoryId: created.current_category_id,
                }
            }

            const existing = await client.query<{
                id: string
                current_step: SessionStep
                current_category_id: string | null
            }>(
                `SELECT id, current_step, current_category_id FROM Sessions
                 WHERE phone_hash = $1 AND status = 'IN_PROGRESS'
                 LIMIT 1`,
                [phoneHash],
            )

            const session = existing.rows[0]
            if (!session) {
                throw new Error("Could not find or create conversation session")
            }

            await client.query("COMMIT")
            return {
                id: session.id,
                created: false,
                currentStep: session.current_step,
                currentCategoryId: session.current_category_id,
            }
        } catch (error) {
            await client.query("ROLLBACK")
            throw error
        } finally {
            client.release()
        }
    },

    async updateNavigationState(sessionId: string, state: NavigationState): Promise<void> {
        const pool = getPool()

        const result = await pool.query(
            `UPDATE Sessions
             SET current_step = $1,
                 current_category_id = $2,
                 last_interaction_at = now()
             WHERE id = $3
               AND status = 'IN_PROGRESS'`,
            [state.currentStep, state.currentCategoryId, sessionId],
        )

        if (result.rowCount !== 1) {
            throw new Error("Conversation session was changed or finished")
        }
    },

    async touch(sessionId: string): Promise<void> {
        const pool = getPool()
        const result = await pool.query(
            `UPDATE Sessions SET last_interaction_at = now()
             WHERE id = $1 AND status = 'IN_PROGRESS'`,
            [sessionId],
        )
        if (result.rowCount !== 1) {
            throw new Error("Conversation session was changed or finished")
        }
    },

    async finish(sessionId: string, closing: SessionClosing): Promise<void> {
        const client = await getPool().connect()
        try {
            await client.query("BEGIN")
            await finishSessionWith(client, sessionId, closing)
            await client.query("COMMIT")
        } catch (error) {
            await client.query("ROLLBACK")
            throw error
        } finally {
            client.release()
        }
    },
}
