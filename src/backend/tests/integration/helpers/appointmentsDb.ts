import getPool from "../../../db/connection"
import { hashCpf } from "../../../utils/cpf.utils"
import { sessionTokens } from "../../../utils/sessionToken"
import type { AppointmentStatus } from "../../../types/appointment.types"

export interface AdminLogin {
    adminUserId: number
    adminCookie: string
    createdAdminId: number | null
}

export interface TestAppointmentScope {
    sessionId: number
    questionId: number
    adminUserId: number
    createdAppointmentIds: number[]
}

export interface TestAppointmentOverrides {
    name?: string
    cpf?: string
    cpfHash?: string
    status?: AppointmentStatus
    appointmentDatetime?: Date
    assignedUserId?: number | null
    appointmentCode?: string
}

export function firstRow<T>(rows: T[]): T {
    const row = rows[0]
    if (!row) {
        throw new Error("Consulta sem linhas")
    }
    return row
}

export async function loginAdmin(): Promise<AdminLogin> {
    const pool = getPool()
    const existingAdmin = await pool.query<{ id: string; session_version: number }>(
        "SELECT id, session_version FROM Users WHERE is_admin LIMIT 1",
    )
    const existing = existingAdmin.rows[0]
    if (existing) {
        const adminUserId = Number(existing.id)
        const sessionVersion = Number(existing.session_version ?? 0)
        return {
            adminUserId,
            adminCookie: `proconchat_access=${sessionTokens.signAccessToken({ userId: adminUserId, sessionVersion })}`,
            createdAdminId: null,
        }
    }

    const userAdminRes = await pool.query<{ id: string; session_version: number }>(
        `INSERT INTO Users (name, email, password_hash, is_admin, active, session_version)
         VALUES ('Admin Teste', $1, 'hash', true, true, 0)
         RETURNING id, session_version`,
        [`admin.integration-${process.pid}-${Date.now()}@teste.local`],
    )
    const adminUserId = Number(firstRow(userAdminRes.rows).id)
    return {
        adminUserId,
        adminCookie: `proconchat_access=${sessionTokens.signAccessToken({ userId: adminUserId, sessionVersion: 0 })}`,
        createdAdminId: adminUserId,
    }
}

export async function createTestAppointment(
    scope: TestAppointmentScope,
    overrides: TestAppointmentOverrides,
): Promise<number> {
    const pool = getPool()
    const cpf = overrides.cpf ?? "52998224725"
    const cpfHash = overrides.cpfHash ?? hashCpf(cpf)
    const name = overrides.name ?? "Cidadão Teste"
    const status = overrides.status ?? "PENDING"
    const apptDate = overrides.appointmentDatetime ?? new Date(Date.now() + 86400000)
    const assignedUserId = status === "PENDING" ? null : (overrides.assignedUserId ?? scope.adminUserId)

    const res = await pool.query<{ id: string }>(
        `INSERT INTO Appointments (
            session_id, question_id, reason, name, cpf_hash, cpf_masked,
            by_representative, documents_sent, appointment_datetime, status, assigned_user_id,
            appointment_code
         ) VALUES (
            $1, $2, 'NOT_RESOLVED', $3, $4, '***.982.247-**',
            false, '{"group": [], "question": []}'::jsonb, $5, $6, $7,
            COALESCE($8::uuid, gen_random_uuid())
         ) RETURNING id`,
        [
            scope.sessionId,
            scope.questionId,
            name,
            cpfHash,
            apptDate,
            status,
            assignedUserId,
            overrides.appointmentCode ?? null,
        ],
    )

    const id = Number(firstRow(res.rows).id)
    scope.createdAppointmentIds.push(id)
    return id
}
