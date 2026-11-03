import getPool from "../../../db/connection"
import type { AppointmentStatus } from "../../../types/appointment.types"
import { encrypt } from "../../../utils/crypto.utils"
import { firstRow } from "./appointmentsDb"
import { hashPhone } from "./phone"

export interface CitizenAppointmentInput {
    phone: string
    questionId: number
    appointmentDatetime: Date
    status?: AppointmentStatus
    assignedUserId?: number | null
    cpfHash?: string
    documentsSent?: { group: string[]; question: string[] }
    byRepresentative?: boolean
}

export interface StoredCitizenAppointment {
    appointmentCode: string
    appointmentDatetime: string
    rescheduledFrom: string | null
    status: string
    assignedUserId: number | null
    reason: string
    documentsSent: unknown
    name: string
    cpfHash: string
    cpfMasked: string
    byRepresentative: boolean
    phoneEncrypted: string | null
    sessionId: number
    offGrid: boolean
}

export async function insertFinishedSession(phone: string): Promise<number> {
    const result = await getPool().query<{ id: string }>(
        `INSERT INTO Sessions (phone_hash, status, outcome, current_step)
         VALUES ($1, 'FINISHED', 'SCHEDULED', 'FINISHED')
         RETURNING id`,
        [hashPhone(phone)],
    )
    return Number(firstRow(result.rows).id)
}

export async function insertCitizenAppointment(input: CitizenAppointmentInput): Promise<string> {
    const sessionId = await insertFinishedSession(input.phone)
    const status = input.status ?? "PENDING"
    const result = await getPool().query<{ id: string }>(
        `INSERT INTO Appointments (
            session_id, question_id, reason, name, cpf_hash, cpf_masked, phone_encrypted,
            by_representative, documents_sent, appointment_datetime, status, assigned_user_id
         ) VALUES (
            $1, $2, 'REQUIRES_IN_PERSON', 'Cidadão Retorno', $3, '***.982.247-**', $4,
            $5, $6::jsonb, $7, $8, $9
         ) RETURNING id`,
        [
            sessionId,
            input.questionId,
            input.cpfHash ?? "c".repeat(64),
            encrypt(input.phone),
            input.byRepresentative ?? false,
            JSON.stringify(input.documentsSent ?? { group: ["RG"], question: ["Contrato"] }),
            input.appointmentDatetime,
            status,
            status === "PENDING" ? null : (input.assignedUserId ?? null),
        ],
    )
    return firstRow(result.rows).id
}

export async function storedCitizenAppointment(id: string): Promise<StoredCitizenAppointment> {
    const row = firstRow(
        (
            await getPool().query<{
                appointment_code: string
                appointment_datetime: Date
                rescheduled_from: Date | null
                status: string
                assigned_user_id: string | null
                reason: string
                documents_sent: unknown
                name: string
                cpf_hash: string
                cpf_masked: string
                by_representative: boolean
                phone_encrypted: string | null
                session_id: string
                off_grid: boolean
            }>(
                `SELECT appointment_code, appointment_datetime, rescheduled_from, status, assigned_user_id,
                        reason, documents_sent, name, cpf_hash, cpf_masked, by_representative,
                        phone_encrypted, session_id, off_grid
                 FROM Appointments WHERE id = $1`,
                [id],
            )
        ).rows,
    )
    return {
        appointmentCode: row.appointment_code,
        appointmentDatetime: new Date(row.appointment_datetime).toISOString(),
        rescheduledFrom: row.rescheduled_from === null ? null : new Date(row.rescheduled_from).toISOString(),
        status: row.status,
        assignedUserId: row.assigned_user_id === null ? null : Number(row.assigned_user_id),
        reason: row.reason,
        documentsSent: row.documents_sent,
        name: row.name,
        cpfHash: row.cpf_hash,
        cpfMasked: row.cpf_masked,
        byRepresentative: row.by_representative,
        phoneEncrypted: row.phone_encrypted,
        sessionId: Number(row.session_id),
        offGrid: row.off_grid,
    }
}
