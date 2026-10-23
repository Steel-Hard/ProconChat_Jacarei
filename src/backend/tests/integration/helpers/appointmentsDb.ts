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
    documentsSent?: { group: string[]; question: string[] }
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
    const documentsSent = overrides.documentsSent ?? { group: [], question: [] }

    const res = await pool.query<{ id: string }>(
        `INSERT INTO Appointments (
            session_id, question_id, reason, name, cpf_hash, cpf_masked,
            by_representative, documents_sent, appointment_datetime, status, assigned_user_id,
            appointment_code
         ) VALUES (
            $1, $2, 'NOT_RESOLVED', $3, $4, '***.982.247-**',
            false, $9::jsonb, $5, $6, $7,
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
            JSON.stringify(documentsSent),
        ],
    )

    const id = Number(firstRow(res.rows).id)
    scope.createdAppointmentIds.push(id)
    return id
}

export interface OwnedAppointmentScope extends TestAppointmentScope {
    categoryId: number
}

export async function createAppointmentScope(adminUserId: number, label: string): Promise<OwnedAppointmentScope> {
    const pool = getPool()
    const key = `${label}_${process.pid}_${Date.now()}`
    const categoryId = Number(
        firstRow(
            (
                await pool.query<{ id: string }>(
                    `INSERT INTO Categories (title, short_title, position, seed_key)
                     VALUES ('Categoria Contas', 'Cat Contas', 99, $1)
                     RETURNING id`,
                    [`cat_${key}`],
                )
            ).rows,
        ).id,
    )
    const questionId = Number(
        firstRow(
            (
                await pool.query<{ id: string }>(
                    `INSERT INTO Questions (category_id, question, short_title, answer, requires_in_person, out_of_scope, llm_allowed, position, seed_key)
                     VALUES ($1, 'Pergunta Contas', 'Perg Contas', 'Resposta teste', true, false, false, 0, $2)
                     RETURNING id`,
                    [categoryId, `q_${key}`],
                )
            ).rows,
        ).id,
    )
    const sessionId = Number(
        firstRow(
            (
                await pool.query<{ id: string }>(
                    `INSERT INTO Sessions (phone_hash, status, outcome, current_step)
                     VALUES ($1, 'FINISHED', 'SCHEDULED', 'FINISHED')
                     RETURNING id`,
                    [hashCpf(key)],
                )
            ).rows,
        ).id,
    )
    return { sessionId, questionId, categoryId, adminUserId, createdAppointmentIds: [] }
}

export async function deleteAppointmentNotes(appointmentIds: number[]): Promise<void> {
    if (appointmentIds.length === 0) {
        return
    }
    const client = await getPool().connect()
    try {
        await client.query("BEGIN")
        await client.query("ALTER TABLE AppointmentNotes DISABLE TRIGGER trg_appointment_notes_immutable")
        await client.query("DELETE FROM AppointmentNotes WHERE appointment_id = ANY($1::bigint[])", [appointmentIds])
        await client.query("ALTER TABLE AppointmentNotes ENABLE TRIGGER trg_appointment_notes_immutable")
        await client.query("COMMIT")
    } catch (error) {
        await client.query("ROLLBACK")
        throw error
    } finally {
        client.release()
    }
}

export async function deleteAppointmentScope(scope: OwnedAppointmentScope): Promise<void> {
    const pool = getPool()
    if (scope.createdAppointmentIds.length > 0) {
        await deleteAppointmentNotes(scope.createdAppointmentIds)
        await pool.query("DELETE FROM AppointmentEvents WHERE appointment_id = ANY($1::bigint[])", [scope.createdAppointmentIds])
        await pool.query("DELETE FROM Appointments WHERE id = ANY($1::bigint[])", [scope.createdAppointmentIds])
    }
    await pool.query("DELETE FROM Sessions WHERE id = $1", [scope.sessionId])
    await pool.query("DELETE FROM Questions WHERE id = $1", [scope.questionId])
    await pool.query("DELETE FROM Categories WHERE id = $1", [scope.categoryId])
}
