import { Pool } from "pg"
import getPool from "../db/connection"
import { AuditLogRepository } from "./auditLog.repository.interface"

interface AuditLogRow {
    id: string
    action: string
    fields: string[]
    actor_user_id: string | null
    actor_name: string | null
    created_at: Date
}

export function createAuditLogRepository(pool: Pool = getPool()): AuditLogRepository {
    return {
        async listByArea(area, limit) {
            const result = await pool.query<AuditLogRow>(
                `SELECT a.id, a.action, COALESCE(a.data->'fields', '[]'::jsonb) AS fields,
                        a.actor_user_id, u.name AS actor_name, a.created_at
                 FROM AuditLog a
                 LEFT JOIN Users u ON u.id = a.actor_user_id
                 WHERE a.area = $1
                 ORDER BY a.created_at DESC, a.id DESC
                 LIMIT $2`,
                [area, limit],
            )
            return result.rows.map((row) => ({
                id: String(row.id),
                action: row.action,
                fields: row.fields,
                actor: row.actor_user_id === null ? null : { id: Number(row.actor_user_id), name: row.actor_name ?? "" },
                createdAt: row.created_at,
            }))
        },
    }
}

export const auditLogRepository = createAuditLogRepository()
