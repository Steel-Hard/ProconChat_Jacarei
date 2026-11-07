import { Pool } from "pg"
import getPool from "../db/connection"
import { hashProviderMessageId } from "../utils/providerMessageHash"
import { inTransaction, PROTOCOL_SQL } from "./responsibleQueries"

export type AppointmentReminderOutcome = "SENT" | "FAILED"

export interface AppointmentReminderTarget {
    id: string
    name: string
    protocol: string
    appointmentDatetime: Date
    phoneEncrypted: string | null
    unitAddress: string
    unitAddressComplement: string | null
    documentsSent: {
        group: string[]
        question: string[]
    }
}

export interface AppointmentReminderRepository {
    findDueTargets(now: Date): Promise<AppointmentReminderTarget[]>
    recordReminderOutcome(
        id: string,
        outcome: AppointmentReminderOutcome,
        now: Date,
        providerMessageId?: string | null,
    ): Promise<boolean>
}

interface ReminderTargetRow {
    id: string
    name: string
    protocol: string
    appointment_datetime: Date
    phone_encrypted: string | null
    unit_address: string
    unit_address_complement: string | null
    documents_sent: {
        group?: string[]
        question?: string[]
    } | null
}

const PRIOR_REMINDER_EVENT_SQL = `EXISTS (
    SELECT 1
    FROM AppointmentEvents e
    WHERE e.appointment_id = a.id
      AND (
          e.type = 'REMINDER_SENT'
          OR (
              e.type IN ('CITIZEN_NOTIFIED', 'CITIZEN_NOTIFICATION_FAILED')
              AND e.data->>'kind' = 'REMINDER'
          )
      )
)`

export function createAppointmentReminderRepository(pool: Pool = getPool()): AppointmentReminderRepository {
    return {
        async findDueTargets(now: Date): Promise<AppointmentReminderTarget[]> {
            const result = await pool.query<ReminderTargetRow>(
                `SELECT a.id::text AS id,
                        a.name,
                        ${PROTOCOL_SQL} AS protocol,
                        a.appointment_datetime,
                        a.phone_encrypted,
                        COALESCE(ver.unit_address, ss.unit_address) AS unit_address,
                        CASE
                            WHEN ver.reminder_enabled IS NOT NULL THEN ver.unit_address_complement
                            ELSE ss.unit_address_complement
                        END AS unit_address_complement,
                        a.documents_sent
                 FROM Appointments a
                 LEFT JOIN LATERAL (
                     SELECT (sc.config->>'reminderEnabled')::boolean AS reminder_enabled,
                            (sc.config->>'reminderHours')::int AS reminder_hours,
                            sc.config->>'unitAddress' AS unit_address,
                            sc.config->>'unitAddressComplement' AS unit_address_complement
                     FROM ScheduleChanges sc
                     WHERE sc.effective_from <= (a.appointment_datetime AT TIME ZONE 'America/Sao_Paulo')::date
                     ORDER BY sc.effective_from DESC
                     LIMIT 1
                 ) ver ON TRUE
                 LEFT JOIN ScheduleSettings ss ON ss.id = 1 AND ver.reminder_enabled IS NULL
                 WHERE a.status IN ('PENDING', 'CONFIRMED')
                   AND a.anonymized_at IS NULL
                   AND a.appointment_datetime > $1
                   AND COALESCE(ver.reminder_enabled, ss.reminder_enabled, FALSE) = TRUE
                   AND a.appointment_datetime <= $1::timestamptz + make_interval(hours => COALESCE(ver.reminder_hours, ss.reminder_hours)::int)
                   AND NOT ${PRIOR_REMINDER_EVENT_SQL}
                 ORDER BY a.appointment_datetime ASC, a.id ASC`,
                [now],
            )
            return result.rows.map((row) => ({
                id: row.id,
                name: row.name,
                protocol: row.protocol,
                appointmentDatetime: new Date(row.appointment_datetime),
                phoneEncrypted: row.phone_encrypted,
                unitAddress: row.unit_address,
                unitAddressComplement: row.unit_address_complement,
                documentsSent: {
                    group: row.documents_sent?.group ?? [],
                    question: row.documents_sent?.question ?? [],
                },
            }))
        },

        async recordReminderOutcome(
            id: string,
            outcome: AppointmentReminderOutcome,
            now: Date,
            providerMessageId: string | null = null,
        ): Promise<boolean> {
            return inTransaction(pool, async (client) => {
                const locked = await client.query<{ id: string }>(
                    `SELECT a.id::text AS id
                     FROM Appointments a
                     WHERE a.id = $1
                       AND a.status IN ('PENDING', 'CONFIRMED')
                       AND NOT ${PRIOR_REMINDER_EVENT_SQL}
                     FOR UPDATE OF a`,
                    [id],
                )
                if ((locked.rowCount ?? 0) === 0) {
                    return false
                }
                if (outcome === "FAILED") {
                    await client.query(
                        `INSERT INTO AppointmentEvents (appointment_id, type, actor_user_id, data, created_at)
                         VALUES ($1, 'CITIZEN_NOTIFICATION_FAILED', NULL, '{"kind":"REMINDER"}'::jsonb, $2)`,
                        [id, now],
                    )
                    await client.query(
                        `INSERT INTO OutboundMessages (kind, appointment_id, status, status_at)
                         VALUES ('REMINDER', $1, 'FAILED', $2)`,
                        [id, now],
                    )
                    return true
                }
                await client.query(
                    `INSERT INTO AppointmentEvents (appointment_id, type, actor_user_id, data, created_at)
                     VALUES ($1, 'REMINDER_SENT', NULL, '{}'::jsonb, $2)`,
                    [id, now],
                )
                if (providerMessageId === null) {
                    return true
                }
                const sent = await client.query<{ status: string }>(
                    `INSERT INTO OutboundMessages (provider_message_hash, kind, appointment_id, status, status_at)
                     VALUES ($1, 'REMINDER', $2, 'SENT', $3)
                     ON CONFLICT (provider_message_hash) DO UPDATE
                     SET kind = EXCLUDED.kind, appointment_id = EXCLUDED.appointment_id
                     RETURNING status`,
                    [hashProviderMessageId(providerMessageId), id, now],
                )
                if (sent.rows[0]?.status === "FAILED") {
                    await client.query(
                        `INSERT INTO AppointmentEvents (appointment_id, type, actor_user_id, data, created_at)
                         VALUES ($1, 'CITIZEN_NOTIFICATION_FAILED', NULL, '{"kind":"REMINDER"}'::jsonb, $2)`,
                        [id, new Date(now.getTime() + 1)],
                    )
                }
                return true
            })
        },
    }
}

export const appointmentReminderRepository = createAppointmentReminderRepository()
