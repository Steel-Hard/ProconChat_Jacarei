import getPool from "../db/connection"

export type SessionStep = "AWAITING_CATEGORY" | "AWAITING_QUESTION" | "FINISHED"

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
    finish(sessionId: string): Promise<void>
}

export const sessionRepository: SessionRepository = {
    async findOrCreateActive(phoneHash: string): Promise<ActiveSession> {
        const pool = getPool()
        const inserted = await pool.query<{
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
            return {
                id: created.id,
                created: true,
                currentStep: created.current_step,
                currentCategoryId: created.current_category_id,
            }
        }

        const existing = await pool.query<{
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

        return {
            id: session.id,
            created: false,
            currentStep: session.current_step,
            currentCategoryId: session.current_category_id,
        }
    },

    async updateNavigationState(sessionId: string, state: NavigationState): Promise<void> {
        const pool = getPool()
        await pool.query(
            `UPDATE Sessions
             SET current_step = $1, current_category_id = $2
             WHERE id = $3`,
            [state.currentStep, state.currentCategoryId, sessionId],
        )
    },

    async finish(sessionId: string): Promise<void> {
        const pool = getPool()
        await pool.query(
            `UPDATE Sessions
             SET status = 'FINISHED', ended_at = now(), current_step = 'FINISHED'
             WHERE id = $1`,
            [sessionId],
        )
    },
}
