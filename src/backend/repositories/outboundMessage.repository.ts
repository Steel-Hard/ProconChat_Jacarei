import { Pool } from "pg"
import getPool from "../db/connection"
import { OutboundKind } from "../types/outboundMessage.types"
import { OutboundMessageRepository } from "./outboundMessage.repository.interface"
import { inTransaction } from "./responsibleQueries"
import { hashProviderMessageId } from "../utils/providerMessageHash"

export function createOutboundMessageRepository(pool: Pool = getPool()): OutboundMessageRepository {
    return {
        async applyStatuses(statuses, now) {
            await inTransaction(pool, async (client) => {
                for (const status of statuses) {
                    const statusAt = status.statusAt ?? now
                    const providerMessageHash = hashProviderMessageId(status.providerMessageId)
                    if (status.status === "FAILED") {
                        await client.query(
                            `WITH failed AS (
                                 INSERT INTO OutboundMessages (provider_message_hash, kind, status, error_code, status_at)
                                 VALUES ($1, 'REPLY', 'FAILED', $2, $3)
                                 ON CONFLICT (provider_message_hash) DO UPDATE
                                 SET status = 'FAILED', error_code = EXCLUDED.error_code, status_at = EXCLUDED.status_at
                                 WHERE OutboundMessages.status <> 'FAILED'
                                 RETURNING kind, appointment_id
                             )
                             INSERT INTO AppointmentEvents (appointment_id, type, actor_user_id, data, created_at)
                             SELECT appointment_id, 'CITIZEN_NOTIFICATION_FAILED', NULL, '{"kind":"CANCELLATION"}'::jsonb, $4
                             FROM failed
                             WHERE kind = 'CANCELLATION' AND appointment_id IS NOT NULL`,
                            [providerMessageHash, status.errorCode, statusAt, now],
                        )
                        continue
                    }
                    await client.query(
                        `UPDATE OutboundMessages
                         SET status = $2::outbound_status, status_at = $3
                         WHERE provider_message_hash = $1 AND status < $2::outbound_status`,
                        [providerMessageHash, status.status, statusAt],
                    )
                }
            })
        },

        async listRecentFailures(since, limit) {
            const result = await pool.query<{
                id: string
                kind: OutboundKind
                error_code: string | null
                status_at: Date
                appointment_id: string | null
                total: number
            }>(
                `SELECT id, kind, error_code, status_at, appointment_id, COUNT(*) OVER ()::int AS total
                 FROM OutboundMessages
                 WHERE status = 'FAILED' AND status_at > $1
                 ORDER BY status_at DESC, id DESC
                 LIMIT $2`,
                [since, limit],
            )
            return {
                count: result.rows[0]?.total ?? 0,
                items: result.rows.map((row) => ({
                    id: String(row.id),
                    kind: row.kind,
                    errorCode: row.error_code,
                    failedAt: row.status_at,
                    appointmentId: row.appointment_id === null ? null : String(row.appointment_id),
                })),
            }
        },
    }
}

export const outboundMessageRepository = createOutboundMessageRepository()
