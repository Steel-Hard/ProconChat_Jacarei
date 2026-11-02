import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"
import getPool from "../../db/connection"
import { retentionRepository } from "../../repositories/retention.repository"
import { scheduleRepository } from "../../repositories/schedule.repository"
import type { AppointmentStatus } from "../../types/appointment.types"
import { encrypt } from "../../utils/crypto.utils"
import { deleteAppointmentNotes, firstRow, loginAdmin } from "./helpers/appointmentsDb"
import { hashPhone } from "./helpers/phone"
import { cleanupScheduleTestData, createTestQuestion } from "./helpers/scheduleDb"
import { deleteTestUsers } from "./helpers/usersDb"

const NOW = new Date("2001-01-01T12:00:00Z")
const DAY_MS = 24 * 60 * 60 * 1000
const WINDOW = { now: NOW, sessionDays: 90, appointmentDays: 365 }
const SESSION_CUTOFF = new Date(NOW.getTime() - 90 * DAY_MS)
const APPOINTMENT_CUTOFF = new Date(NOW.getTime() - 365 * DAY_MS)

function plusSeconds(date: Date, seconds: number): Date {
    return new Date(date.getTime() + seconds * 1000)
}

interface StoredSession {
    phone_hash: string | null
    anonymized_at: Date | null
    status: string
    outcome: string
    current_step: string
    started_at: Date
    ended_at: Date | null
    last_interaction_at: Date
}

interface StoredAppointment {
    name: string
    cpf_hash: string | null
    cpf_masked: string | null
    phone_encrypted: string | null
    anonymized_at: Date | null
    status: string
    appointment_datetime: Date
    assigned_user_id: string | null
    question_id: string
    documents_sent: unknown
    session_id: string
}

describe("anonimizacao por prazo de conversas e agendamentos (Postgres)", () => {
    const sessionIds: string[] = []
    const appointmentIds: string[] = []
    let questionId: number
    let adminUserId: number
    let createdAdminId: number | null = null
    let created = 0

    function nextPhone(): string {
        created += 1
        return `55000000070${created.toString().padStart(2, "0")}`
    }

    async function session(input: {
        endedAt: Date | null
        lastInteractionAt?: Date
        status?: "FINISHED" | "ABANDONED" | "IN_PROGRESS"
    }): Promise<{ id: string; phoneHash: string }> {
        const phoneHash = hashPhone(nextPhone())
        const status = input.status ?? "FINISHED"
        const lastInteractionAt = input.lastInteractionAt ?? input.endedAt ?? new Date("1999-01-01T12:00:00Z")
        const closed = status !== "IN_PROGRESS"
        const result = await getPool().query<{ id: string }>(
            `INSERT INTO Sessions (phone_hash, status, outcome, current_step, abandoned_at_step, started_at, ended_at, last_interaction_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id`,
            [
                phoneHash,
                status,
                status === "FINISHED" ? "RESOLVED" : status,
                closed ? "FINISHED" : "AWAITING_CATEGORY",
                status === "ABANDONED" ? "AWAITING_QUESTION" : null,
                new Date(lastInteractionAt.getTime() - 60_000),
                input.endedAt,
                lastInteractionAt,
            ],
        )
        const id = firstRow(result.rows).id
        sessionIds.push(id)
        return { id, phoneHash }
    }

    async function appointment(input: {
        sessionId: string
        at: Date
        status?: AppointmentStatus
    }): Promise<string> {
        const status = input.status ?? "PENDING"
        const result = await getPool().query<{ id: string }>(
            `INSERT INTO Appointments (
                session_id, question_id, reason, name, cpf_hash, cpf_masked, phone_encrypted,
                documents_sent, appointment_datetime, status, assigned_user_id
             ) VALUES ($1, $2, 'REQUIRES_IN_PERSON', 'Cidadão Retenção', $3, '***.982.247-**', $4, $5::jsonb, $6, $7, $8)
             RETURNING id`,
            [
                input.sessionId,
                questionId,
                (appointmentIds.length + 1).toString(16).padStart(64, "0"),
                encrypt(nextPhone()),
                JSON.stringify({ group: ["RG"], question: ["Contrato"] }),
                input.at,
                status,
                status === "PENDING" ? null : adminUserId,
            ],
        )
        const id = firstRow(result.rows).id
        appointmentIds.push(id)
        return id
    }

    async function storedSession(id: string): Promise<StoredSession> {
        return firstRow(
            (
                await getPool().query<StoredSession>(
                    `SELECT phone_hash, anonymized_at, status, outcome, current_step, started_at, ended_at, last_interaction_at
                     FROM Sessions WHERE id = $1`,
                    [id],
                )
            ).rows,
        )
    }

    async function storedAppointment(id: string): Promise<StoredAppointment> {
        return firstRow(
            (
                await getPool().query<StoredAppointment>(
                    `SELECT name, cpf_hash, cpf_masked, phone_encrypted, anonymized_at, status, appointment_datetime,
                            assigned_user_id, question_id, documents_sent, session_id
                     FROM Appointments WHERE id = $1`,
                    [id],
                )
            ).rows,
        )
    }

    async function related(): Promise<Record<string, unknown[]>> {
        const pool = getPool()
        return {
            conversationEvents: (
                await pool.query(
                    "SELECT * FROM ConversationEvents WHERE session_id = ANY($1::bigint[]) OR appointment_id = ANY($2::bigint[]) ORDER BY id",
                    [sessionIds, appointmentIds],
                )
            ).rows,
            appointmentEvents: (
                await pool.query("SELECT * FROM AppointmentEvents WHERE appointment_id = ANY($1::bigint[]) ORDER BY id", [
                    appointmentIds,
                ])
            ).rows,
            appointmentNotes: (
                await pool.query("SELECT * FROM AppointmentNotes WHERE appointment_id = ANY($1::bigint[]) ORDER BY id", [
                    appointmentIds,
                ])
            ).rows,
        }
    }

    async function auditCount(): Promise<number> {
        return firstRow((await getPool().query<{ n: number }>("SELECT count(*)::int AS n FROM AuditLog")).rows).n
    }

    async function allRows(): Promise<unknown[]> {
        const sessions = await getPool().query("SELECT * FROM Sessions WHERE id = ANY($1::bigint[]) ORDER BY id", [sessionIds])
        const appointments = await getPool().query("SELECT * FROM Appointments WHERE id = ANY($1::bigint[]) ORDER BY id", [
            appointmentIds,
        ])
        return [...sessions.rows, ...appointments.rows]
    }

    beforeAll(async () => {
        questionId = (await createTestQuestion()).questionId
        const admin = await loginAdmin()
        adminUserId = admin.adminUserId
        createdAdminId = admin.createdAdminId
    })

    beforeEach(async () => {
        const foreign = firstRow(
            (
                await getPool().query<{ sessions: number; appointments: number }>(
                    `SELECT
                        (SELECT count(*)::int FROM Sessions
                         WHERE COALESCE(ended_at, last_interaction_at) <= $1 AND NOT (id = ANY($2::bigint[]))) AS sessions,
                        (SELECT count(*)::int FROM Appointments
                         WHERE appointment_datetime <= $1 AND NOT (id = ANY($3::bigint[]))) AS appointments`,
                    [NOW, sessionIds, appointmentIds],
                )
            ).rows,
        )
        if (foreign.sessions > 0 || foreign.appointments > 0) {
            throw new Error(
                `Pré-condição: o banco tem ${foreign.sessions} sessões e ${foreign.appointments} agendamentos de fora deste teste com data até ${NOW.toISOString()}. Rode a integração num banco separado, sem dados antigos.`,
            )
        }
    })

    afterEach(async () => {
        const pool = getPool()
        await pool.query("DELETE FROM ConversationEvents WHERE session_id = ANY($1::bigint[]) OR appointment_id = ANY($2::bigint[])", [
            sessionIds,
            appointmentIds,
        ])
        await pool.query("DELETE FROM AppointmentEvents WHERE appointment_id = ANY($1::bigint[])", [appointmentIds])
        await deleteAppointmentNotes(appointmentIds.map(Number))
        await pool.query("DELETE FROM Appointments WHERE id = ANY($1::bigint[])", [appointmentIds])
        await pool.query("DELETE FROM Sessions WHERE id = ANY($1::bigint[])", [sessionIds])
        sessionIds.length = 0
        appointmentIds.length = 0
    })

    afterAll(async () => {
        await cleanupScheduleTestData({ phoneHashes: [], appointmentIds: [] })
        await deleteTestUsers([createdAdminId])
        await getPool().end()
    })

    it("anonimiza a conversa terminada exatamente no limite do prazo", async () => {
        const { id } = await session({ endedAt: SESSION_CUTOFF })

        await retentionRepository.anonymizeDue({ ...WINDOW, limit: 1000 })

        const stored = await storedSession(id)
        expect(stored.phone_hash).toBeNull()
        expect(stored.anonymized_at).toEqual(NOW)
    })

    it("mantem o hash da conversa terminada um segundo depois do limite", async () => {
        const { id, phoneHash } = await session({ endedAt: plusSeconds(SESSION_CUTOFF, 1) })

        await retentionRepository.anonymizeDue({ ...WINDOW, limit: 1000 })

        const stored = await storedSession(id)
        expect(stored.phone_hash).toBe(phoneHash)
        expect(stored.anonymized_at).toBeNull()
    })

    it("nao anonimiza a conversa em andamento com interacao antiga", async () => {
        const { id, phoneHash } = await session({
            endedAt: null,
            lastInteractionAt: new Date("1999-01-01T12:00:00Z"),
            status: "IN_PROGRESS",
        })

        await retentionRepository.anonymizeDue({ ...WINDOW, limit: 1000 })

        const stored = await storedSession(id)
        expect(stored.phone_hash).toBe(phoneHash)
        expect(stored.anonymized_at).toBeNull()
    })

    it("anonimiza a conversa terminada sem ended_at pela ultima interacao", async () => {
        const { id } = await session({ endedAt: null, lastInteractionAt: SESSION_CUTOFF, status: "ABANDONED" })

        await retentionRepository.anonymizeDue({ ...WINDOW, limit: 1000 })

        const stored = await storedSession(id)
        expect(stored.phone_hash).toBeNull()
        expect(stored.anonymized_at).toEqual(NOW)
    })

    it("nao anonimiza a conversa antiga cujo agendamento passado ainda esta dentro do prazo", async () => {
        const { id, phoneHash } = await session({ endedAt: new Date("1999-06-01T12:00:00Z") })
        await appointment({ sessionId: id, at: plusSeconds(APPOINTMENT_CUTOFF, 1), status: "ATTENDED" })

        await retentionRepository.anonymizeDue({ ...WINDOW, limit: 1000 })

        expect((await storedSession(id)).phone_hash).toBe(phoneHash)
    })

    it("mantem a conversa antiga com agendamento futuro e o retorno do cidadao continua achando o agendamento", async () => {
        const { id, phoneHash } = await session({ endedAt: new Date("1999-06-01T12:00:00Z") })
        const future = await appointment({ sessionId: id, at: new Date("2001-02-01T12:00:00Z"), status: "CONFIRMED" })

        await retentionRepository.anonymizeDue({ ...WINDOW, limit: 1000 })

        expect((await storedSession(id)).phone_hash).toBe(phoneHash)
        expect((await scheduleRepository.findReturningAppointment(phoneHash, NOW))?.id).toBe(future)
    })

    it.each(["PENDING", "CONFIRMED", "ATTENDED", "NO_SHOW", "CANCELED"] as const)(
        "anonimiza o agendamento %s exatamente no limite do prazo",
        async (status) => {
            const { id: sessionId } = await session({ endedAt: null, lastInteractionAt: NOW, status: "FINISHED" })
            const id = await appointment({ sessionId, at: APPOINTMENT_CUTOFF, status })

            await retentionRepository.anonymizeDue({ ...WINDOW, limit: 1000 })

            const stored = await storedAppointment(id)
            expect({
                name: stored.name,
                cpf_hash: stored.cpf_hash,
                cpf_masked: stored.cpf_masked,
                phone_encrypted: stored.phone_encrypted,
                anonymized_at: stored.anonymized_at,
                status: stored.status,
            }).toEqual({
                name: "Titular removido",
                cpf_hash: null,
                cpf_masked: null,
                phone_encrypted: null,
                anonymized_at: NOW,
                status,
            })
        },
    )

    it("mantem o agendamento um segundo depois do limite do prazo", async () => {
        const { id: sessionId } = await session({ endedAt: null, lastInteractionAt: NOW, status: "FINISHED" })
        const id = await appointment({ sessionId, at: plusSeconds(APPOINTMENT_CUTOFF, 1), status: "ATTENDED" })
        const before = await storedAppointment(id)

        await retentionRepository.anonymizeDue({ ...WINDOW, limit: 1000 })

        expect(await storedAppointment(id)).toEqual(before)
        expect(before.name).toBe("Cidadão Retenção")
    })

    it("anonimiza na mesma execucao a conversa cujo agendamento venceu", async () => {
        const { id: sessionId } = await session({ endedAt: new Date("1999-06-01T12:00:00Z") })
        const appointmentId = await appointment({ sessionId, at: APPOINTMENT_CUTOFF, status: "ATTENDED" })

        const result = await retentionRepository.anonymizeDue({ ...WINDOW, limit: 1000 })

        expect(result).toEqual({ sessions: 1, appointments: 1 })
        expect((await storedSession(sessionId)).phone_hash).toBeNull()
        expect((await storedAppointment(appointmentId)).anonymized_at).toEqual(NOW)
    })

    it("mantem o restante da conversa e do agendamento, os eventos, as observacoes e o registro de alteracoes", async () => {
        const { id: sessionId } = await session({ endedAt: new Date("1999-06-01T12:00:00Z"), status: "ABANDONED" })
        const appointmentId = await appointment({ sessionId, at: new Date("1999-06-02T12:00:00Z"), status: "NO_SHOW" })
        const pool = getPool()
        await pool.query("INSERT INTO ConversationEvents (session_id, type) VALUES ($1, 'STARTED')", [sessionId])
        await pool.query(
            "INSERT INTO ConversationEvents (session_id, type, appointment_id, data) VALUES ($1, 'APPOINTMENT_CREATED', $2, '{}'::jsonb)",
            [sessionId, appointmentId],
        )
        await pool.query("INSERT INTO AppointmentEvents (appointment_id, type, actor_user_id, data) VALUES ($1, 'NO_SHOW', $2, '{}'::jsonb)", [
            appointmentId,
            adminUserId,
        ])
        await pool.query("INSERT INTO AppointmentNotes (appointment_id, author_user_id, text) VALUES ($1, $2, 'Não compareceu')", [
            appointmentId,
            adminUserId,
        ])
        const { phone_hash: _hash, anonymized_at: _sessionAt, ...sessionBefore } = await storedSession(sessionId)
        const {
            name: _name,
            cpf_hash: _cpfHash,
            cpf_masked: _cpfMasked,
            phone_encrypted: _phone,
            anonymized_at: _appointmentAt,
            ...appointmentBefore
        } = await storedAppointment(appointmentId)
        const relatedBefore = await related()
        const auditBefore = await auditCount()

        await retentionRepository.anonymizeDue({ ...WINDOW, limit: 1000 })

        const { phone_hash, anonymized_at, ...sessionAfter } = await storedSession(sessionId)
        const { name, cpf_hash, cpf_masked, phone_encrypted, anonymized_at: appointmentAt, ...appointmentAfter } =
            await storedAppointment(appointmentId)
        expect({ phone_hash, anonymized_at, name, cpf_hash, cpf_masked, phone_encrypted, appointmentAt }).toEqual({
            phone_hash: null,
            anonymized_at: NOW,
            name: "Titular removido",
            cpf_hash: null,
            cpf_masked: null,
            phone_encrypted: null,
            appointmentAt: NOW,
        })
        expect(sessionAfter).toEqual(sessionBefore)
        expect(appointmentAfter).toEqual(appointmentBefore)
        expect(appointmentAfter.assigned_user_id).toBe(String(adminUserId))
        expect(await related()).toEqual(relatedBefore)
        expect(relatedBefore.conversationEvents).toHaveLength(2)
        expect(relatedBefore.appointmentEvents).toHaveLength(1)
        expect(relatedBefore.appointmentNotes).toHaveLength(1)
        expect(await auditCount()).toBe(auditBefore)
    })

    it("conta na previa o mesmo que a anonimizacao seguinte devolve e a segunda execucao devolve zero", async () => {
        const old = await session({ endedAt: new Date("1999-06-01T12:00:00Z") })
        await appointment({ sessionId: old.id, at: new Date("1999-07-01T12:00:00Z"), status: "ATTENDED" })
        await session({ endedAt: SESSION_CUTOFF })
        await session({ endedAt: plusSeconds(SESSION_CUTOFF, 1) })
        const kept = await session({ endedAt: new Date("1999-06-01T12:00:00Z") })
        await appointment({ sessionId: kept.id, at: new Date("2001-02-01T12:00:00Z"), status: "PENDING" })
        await appointment({ sessionId: kept.id, at: APPOINTMENT_CUTOFF, status: "CANCELED" })

        const preview = await retentionRepository.countDue(WINDOW)
        const first = await retentionRepository.anonymizeDue({ ...WINDOW, limit: 1000 })
        const second = await retentionRepository.anonymizeDue({ ...WINDOW, limit: 1000 })

        expect(preview).toEqual({ sessions: 2, appointments: 2 })
        expect(first).toEqual(preview)
        expect(second).toEqual({ sessions: 0, appointments: 0 })
    })

    it("com limite 2 anonimiza so os 2 agendamentos mais antigos", async () => {
        const { id: sessionId } = await session({ endedAt: null, lastInteractionAt: NOW, status: "FINISHED" })
        const oldest = await appointment({ sessionId, at: new Date("1999-03-01T12:00:00Z"), status: "CANCELED" })
        const newest = await appointment({ sessionId, at: new Date("1999-05-01T12:00:00Z"), status: "CANCELED" })
        const middle = await appointment({ sessionId, at: new Date("1999-04-01T12:00:00Z"), status: "CANCELED" })

        const result = await retentionRepository.anonymizeDue({ ...WINDOW, limit: 2 })

        expect(result).toEqual({ sessions: 0, appointments: 2 })
        expect((await storedAppointment(oldest)).anonymized_at).toEqual(NOW)
        expect((await storedAppointment(middle)).anonymized_at).toEqual(NOW)
        expect((await storedAppointment(newest)).anonymized_at).toBeNull()
    })

    it("com limite 2 anonimiza so as 2 conversas mais antigas", async () => {
        const newest = await session({ endedAt: new Date("1999-05-01T12:00:00Z") })
        const oldest = await session({ endedAt: null, lastInteractionAt: new Date("1999-03-01T12:00:00Z"), status: "ABANDONED" })
        const middle = await session({ endedAt: new Date("1999-04-01T12:00:00Z") })

        const result = await retentionRepository.anonymizeDue({ ...WINDOW, limit: 2 })

        expect(result).toEqual({ sessions: 2, appointments: 0 })
        expect((await storedSession(oldest.id)).phone_hash).toBeNull()
        expect((await storedSession(middle.id)).phone_hash).toBeNull()
        expect((await storedSession(newest.id)).phone_hash).toBe(newest.phoneHash)
    })

    it("a contagem da previa nao altera nenhuma linha", async () => {
        const { id: sessionId } = await session({ endedAt: new Date("1999-06-01T12:00:00Z") })
        await appointment({ sessionId, at: new Date("1999-07-01T12:00:00Z"), status: "ATTENDED" })
        const before = await allRows()

        const preview = await retentionRepository.countDue(WINDOW)

        expect(preview).toEqual({ sessions: 1, appointments: 1 })
        expect(await allRows()).toEqual(before)
    })
})
