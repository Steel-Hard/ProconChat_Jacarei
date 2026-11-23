import { PoolClient } from "pg"
import type { AssignedEventData, BackToPendingEventData } from "../types/appointment.types"

export interface AssignAppointmentInput {
    appointmentId: string
    assigneeUserId: number
    actorUserId: number
    data: AssignedEventData
    now: Date
}

export interface ReturnAppointmentToPendingInput {
    appointmentId: string
    actorUserId: number | null
    data: BackToPendingEventData
    now: Date
}

const INSERT_EVENT = `INSERT INTO AppointmentEvents (appointment_id, type, actor_user_id, data, created_at)
     VALUES ($1, $2, $3, $4::jsonb, $5)`

export async function assignAppointment(client: PoolClient, input: AssignAppointmentInput): Promise<void> {
    await client.query("UPDATE Appointments SET status = 'CONFIRMED', assigned_user_id = $2 WHERE id = $1", [
        input.appointmentId,
        input.assigneeUserId,
    ])
    await client.query(INSERT_EVENT, [
        input.appointmentId,
        "ASSIGNED",
        input.actorUserId,
        JSON.stringify(input.data),
        input.now,
    ])
}

export async function returnAppointmentToPending(
    client: PoolClient,
    input: ReturnAppointmentToPendingInput,
): Promise<void> {
    await client.query("UPDATE Appointments SET status = 'PENDING', assigned_user_id = NULL WHERE id = $1", [
        input.appointmentId,
    ])
    await client.query(INSERT_EVENT, [
        input.appointmentId,
        "BACK_TO_PENDING",
        input.actorUserId,
        JSON.stringify(input.data),
        input.now,
    ])
}
