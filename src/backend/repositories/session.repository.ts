import getPool from "../db/connection"

export interface ActiveSession {
    id: string
    created: boolean
}

export interface SessionRepository {
    findOrCreateActive(phoneHash: string): Promise<ActiveSession>
}

export const sessionRepository: SessionRepository = {
    async findOrCreateActive(phoneHash: string): Promise<ActiveSession> {
        const pool = getPool()
        const inserted = await pool.query<{ id: string }>(
            `INSERT INTO Sessions (phone_hash)
             VALUES ($1)
             ON CONFLICT (phone_hash) WHERE status = 'IN_PROGRESS' DO NOTHING
             RETURNING id`,
            [phoneHash],
        )

        const created = inserted.rows[0]
        if (created) {
            return { id: created.id, created: true }
        }

        const existing = await pool.query<{ id: string }>(
            `SELECT id FROM Sessions
             WHERE phone_hash = $1 AND status = 'IN_PROGRESS'
             LIMIT 1`,
            [phoneHash],
        )

        const session = existing.rows[0]
        if (!session) {
            throw new Error("Could not find or create conversation session")
        }

        return { id: session.id, created: false }
    },
}
