import getPool from "../db/connection"

export interface RetentionWindow {
    now: Date
    sessionDays: number
    appointmentDays: number
}

export interface RetentionCounts {
    sessions: number
    appointments: number
}

export interface RetentionRepository {
    countDue(window: RetentionWindow): Promise<RetentionCounts>
    anonymizeDue(window: RetentionWindow & { limit: number }): Promise<RetentionCounts>
}

function cutoff(days: string): string {
    return `$1::timestamptz - ${days}::int * interval '24 hours'`
}

const DUE_SESSION = `s.anonymized_at IS NULL
    AND s.status <> 'IN_PROGRESS'
    AND COALESCE(s.ended_at, s.last_interaction_at) <= ${cutoff("$3")}
    AND NOT EXISTS (
        SELECT 1
        FROM Appointments a
        WHERE a.session_id = s.id
          AND a.anonymized_at IS NULL
          AND a.appointment_datetime > ${cutoff("$2")}
    )`

const DUE_APPOINTMENT = `a.anonymized_at IS NULL
    AND a.appointment_datetime <= ${cutoff("$2")}`

export const retentionRepository: RetentionRepository = {
    async countDue({ now, sessionDays, appointmentDays }) {
        const result = await getPool().query<RetentionCounts>(
            `SELECT
                (SELECT count(*)::int FROM Sessions s WHERE ${DUE_SESSION}) AS sessions,
                (SELECT count(*)::int FROM Appointments a WHERE ${DUE_APPOINTMENT}) AS appointments`,
            [now, appointmentDays, sessionDays],
        )
        const row = result.rows[0]
        return { sessions: row?.sessions ?? 0, appointments: row?.appointments ?? 0 }
    },

    async anonymizeDue({ now, sessionDays, appointmentDays, limit }) {
        const appointments = await getPool().query(
            `WITH due AS (
                SELECT a.id
                FROM Appointments a
                WHERE ${DUE_APPOINTMENT}
                ORDER BY a.appointment_datetime, a.id
                LIMIT $3
                FOR UPDATE SKIP LOCKED
            )
            UPDATE Appointments AS target
            SET name = 'Titular removido',
                cpf_hash = NULL,
                cpf_masked = NULL,
                phone_encrypted = NULL,
                anonymized_at = $1
            FROM due
            WHERE target.id = due.id`,
            [now, appointmentDays, limit],
        )
        const sessions = await getPool().query(
            `WITH due AS (
                SELECT s.id
                FROM Sessions s
                WHERE ${DUE_SESSION}
                ORDER BY COALESCE(s.ended_at, s.last_interaction_at), s.id
                LIMIT $4
                FOR UPDATE SKIP LOCKED
            )
            UPDATE Sessions AS target
            SET phone_hash = NULL, anonymized_at = $1
            FROM due
            WHERE target.id = due.id`,
            [now, appointmentDays, sessionDays, limit],
        )
        return { sessions: sessions.rowCount ?? 0, appointments: appointments.rowCount ?? 0 }
    },
}
