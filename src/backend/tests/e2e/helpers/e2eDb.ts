import getPool from "../../../db/connection"
import { hashPhone } from "../../integration/helpers/phone"

export interface E2eAppointment {
    id: number
    status: string
    assignedUserId: number | null
    appointmentDatetime: Date
    rescheduledFrom: Date | null
}

export interface E2eSessionEvent {
    type: string
    appointmentId: number | null
    data: Record<string, unknown>
}

export interface E2eSession {
    id: number
    status: string
    outcome: string
    draft: unknown
    events: E2eSessionEvent[]
}

export async function appointmentByProtocol(protocol: string): Promise<E2eAppointment> {
    const result = await getPool().query<{
        id: string
        status: string
        assigned_user_id: string | null
        appointment_datetime: Date
        rescheduled_from: Date | null
    }>(
        `SELECT id, status, assigned_user_id, appointment_datetime, rescheduled_from
         FROM Appointments
         WHERE upper(left(appointment_code::text, 8)) = $1`,
        [protocol],
    )
    if (result.rows.length !== 1) {
        throw new Error(`Esperava 1 agendamento para o protocolo, encontrou ${result.rows.length}`)
    }
    const row = result.rows[0]!
    return {
        id: Number(row.id),
        status: row.status,
        assignedUserId: row.assigned_user_id === null ? null : Number(row.assigned_user_id),
        appointmentDatetime: row.appointment_datetime,
        rescheduledFrom: row.rescheduled_from,
    }
}

export async function sessionsOfPhone(phone: string): Promise<E2eSession[]> {
    const pool = getPool()
    const sessions = await pool.query<{ id: string; status: string; outcome: string; draft: unknown }>(
        "SELECT id, status, outcome, draft FROM Sessions WHERE phone_hash = $1 ORDER BY id",
        [hashPhone(phone)],
    )
    const result: E2eSession[] = []
    for (const session of sessions.rows) {
        const events = await pool.query<{ type: string; appointment_id: string | null; data: Record<string, unknown> }>(
            "SELECT type, appointment_id, data FROM ConversationEvents WHERE session_id = $1 ORDER BY id",
            [session.id],
        )
        result.push({
            id: Number(session.id),
            status: session.status,
            outcome: session.outcome,
            draft: session.draft,
            events: events.rows.map((event) => ({
                type: event.type,
                appointmentId: event.appointment_id === null ? null : Number(event.appointment_id),
                data: event.data,
            })),
        })
    }
    return result
}

export async function moveAppointmentToPast(appointmentId: number): Promise<void> {
    await getPool().query("UPDATE Appointments SET appointment_datetime = now() - interval '1 minute' WHERE id = $1", [
        appointmentId,
    ])
}
