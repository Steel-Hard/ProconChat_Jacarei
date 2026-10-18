import { createHmac } from "node:crypto"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import app from "../../app"
import getPool from "../../db/connection"
import { insertConversationEvent } from "../../repositories/conversationEvent.repository"
import { sessionTokens } from "../../utils/sessionToken"

const testSecret = process.env.CPF_HASH_SECRET ?? "test-only-cpf-hash-secret"
const ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173"

function computeHmac(cpf: string): string {
    return createHmac("sha256", testSecret).update(cpf.replace(/\D/g, ""), "utf8").digest("hex").toLowerCase()
}

describe("Agendamentos com Postgres (integração)", () => {
    let adminUserId: number
    let createdAdminId: number | null = null
    let categoryId: number
    let questionId: number
    let sessionId: number

    let adminCookie: string

    const createdAppointmentIds: number[] = []

    beforeAll(async () => {
        const pool = getPool()

        const existingAdmin = await pool.query<{ id: string; session_version: number }>(
            "SELECT id, session_version FROM Users WHERE is_admin LIMIT 1",
        )
        if (existingAdmin.rows.length > 0) {
            adminUserId = Number(existingAdmin.rows[0].id)
            const sessionVersion = Number(existingAdmin.rows[0].session_version ?? 0)
            adminCookie = `proconchat_access=${sessionTokens.signAccessToken({ userId: adminUserId, sessionVersion })}`
        } else {
            const userAdminRes = await pool.query<{ id: string; session_version: number }>(
                `INSERT INTO Users (name, email, password_hash, is_admin, active, session_version)
                 VALUES ('Admin Teste', $1, 'hash', true, true, 0)
                 RETURNING id, session_version`,
                [`admin.integration-${process.pid}-${Date.now()}@teste.local`],
            )
            adminUserId = Number(userAdminRes.rows[0].id)
            createdAdminId = adminUserId
            adminCookie = `proconchat_access=${sessionTokens.signAccessToken({ userId: adminUserId, sessionVersion: 0 })}`
        }

        const catRes = await pool.query<{ id: string }>(
            `INSERT INTO Categories (title, short_title, position, seed_key)
             VALUES ('Categoria Integracao', 'Cat Int', 99, 'cat_integration_test')
             RETURNING id`,
        )
        categoryId = Number(catRes.rows[0].id)

        const qRes = await pool.query<{ id: string }>(
            `INSERT INTO Questions (category_id, question, short_title, answer, requires_in_person, out_of_scope, llm_allowed, position, seed_key)
             VALUES ($1, 'Pergunta Integracao', 'Perg Int', 'Resposta teste', true, false, false, 0, 'q_integration_test')
             RETURNING id`,
            [categoryId],
        )
        questionId = Number(qRes.rows[0].id)

        const sessRes = await pool.query<{ id: string }>(
            `INSERT INTO Sessions (phone_hash, status, outcome, current_step)
             VALUES ('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'FINISHED', 'SCHEDULED', 'FINISHED')
             RETURNING id`,
        )
        sessionId = Number(sessRes.rows[0].id)
    })

    afterAll(async () => {
        const pool = getPool()
        if (createdAppointmentIds.length > 0) {
            await pool.query(`DELETE FROM AppointmentEvents WHERE appointment_id = ANY($1::bigint[])`, [createdAppointmentIds])
            await pool.query(`DELETE FROM Appointments WHERE id = ANY($1::bigint[])`, [createdAppointmentIds])
        }
        if (sessionId) {
            await pool.query(`DELETE FROM Sessions WHERE id = $1`, [sessionId])
        }
        if (questionId) {
            await pool.query(`DELETE FROM Questions WHERE id = $1`, [questionId])
        }
        if (categoryId) {
            await pool.query(`DELETE FROM Categories WHERE id = $1`, [categoryId])
        }
        if (createdAdminId) {
            await pool.query(`DELETE FROM Users WHERE id = $1`, [createdAdminId])
        }
        await pool.end()
    })

    async function createAppointment(overrides: {
        name?: string
        cpf?: string
        status?: "PENDING" | "CONFIRMED" | "ATTENDED" | "NO_SHOW" | "CANCELED"
        appointmentDatetime?: Date
        assignedUserId?: number | null
        appointmentCode?: string
    }): Promise<number> {
        const pool = getPool()
        const cpf = overrides.cpf ?? "52998224725"
        const cpfHash = computeHmac(cpf)
        const name = overrides.name ?? "Cidadão Teste"
        const status = overrides.status ?? "PENDING"
        const apptDate = overrides.appointmentDatetime ?? new Date(Date.now() + 86400000)
        const assignedUserId = status === "PENDING" ? null : (overrides.assignedUserId ?? adminUserId)

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
            [sessionId, questionId, name, cpfHash, apptDate, status, assignedUserId, overrides.appointmentCode ?? null],
        )

        const id = Number(res.rows[0].id)
        createdAppointmentIds.push(id)
        return id
    }

    it("busca por CPF com hash HMAC encontra agendamento digitado com e sem pontuação", async () => {
        const cpfDigits = "52998224725"
        const id = await createAppointment({ name: "Maria CPF HMAC", cpf: cpfDigits })

        const resRaw = await request(app)
            .get(`/api/v1/appointments?search=${cpfDigits}`)
            .set("Cookie", adminCookie)
        expect(resRaw.status).toBe(200)
        expect(resRaw.body.data.items.some((item: { id: string }) => item.id === String(id))).toBe(true)

        const resFormatted = await request(app)
            .get("/api/v1/appointments?search=529.982.247-25")
            .set("Cookie", adminCookie)
        expect(resFormatted.status).toBe(200)
        expect(resFormatted.body.data.items.some((item: { id: string }) => item.id === String(id))).toBe(true)
    })

    it("busca com letras e 11 dígitos procura pelo protocolo e não pelo CPF", async () => {
        const suffix = String(process.pid % 1000000).padStart(6, "0") + String(Date.now() % 1000000).padStart(6, "0")
        const appointmentCode = `12345678-90ab-4cde-8f01-${suffix}`
        const id = await createAppointment({ name: "Cidadão Protocolo", cpf: "12345678909", appointmentCode })

        const res = await request(app)
            .get("/api/v1/appointments?search=12345678-90ab-4c")
            .set("Cookie", adminCookie)

        expect(res.status).toBe(200)
        expect(res.body.data.items.some((item: { id: string }) => item.id === String(id))).toBe(true)
    })

    it("busca textual escapa corretamente caracteres especiais % e _", async () => {
        const idUnderline = await createAppointment({ name: "Carlos_Especial", cpf: "11144477735" })
        const idNormal = await createAppointment({ name: "Carlos Especial", cpf: "22255588899" })

        const resUnderline = await request(app)
            .get("/api/v1/appointments?search=Carlos_")
            .set("Cookie", adminCookie)
        expect(resUnderline.status).toBe(200)
        const foundIds = resUnderline.body.data.items.map((i: { id: string }) => i.id)
        expect(foundIds).toContain(String(idUnderline))
        expect(foundIds).not.toContain(String(idNormal))
    })

    it("aplica precedência do chip de status sobre period=all (CANCELED decrescente e PENDING crescente)", async () => {
        const idCanceled1 = await createAppointment({
            name: "Canceled +5d",
            status: "CANCELED",
            appointmentDatetime: new Date(Date.now() + 5 * 86400000),
            cpf: "10101010101",
        })
        const idCanceled2 = await createAppointment({
            name: "Canceled +2d",
            status: "CANCELED",
            appointmentDatetime: new Date(Date.now() + 2 * 86400000),
            cpf: "20202020202",
        })
        const idCanceled3 = await createAppointment({
            name: "Canceled -3d",
            status: "CANCELED",
            appointmentDatetime: new Date(Date.now() - 3 * 86400000),
            cpf: "30303030303",
        })

        const resCanceled = await request(app)
            .get("/api/v1/appointments?status=CANCELED&period=all&limit=100")
            .set("Cookie", adminCookie)
        expect(resCanceled.status).toBe(200)
        const canceledItems = resCanceled.body.data.items.filter((i: { id: string }) =>
            [String(idCanceled1), String(idCanceled2), String(idCanceled3)].includes(i.id),
        )
        expect(canceledItems.map((i: { id: string }) => i.id)).toEqual([
            String(idCanceled1),
            String(idCanceled2),
            String(idCanceled3),
        ])

        const idPending1 = await createAppointment({
            name: "Pending +3d",
            status: "PENDING",
            appointmentDatetime: new Date(Date.now() + 3 * 86400000),
            cpf: "40404040404",
        })
        const idPending2 = await createAppointment({
            name: "Pending +1d",
            status: "PENDING",
            appointmentDatetime: new Date(Date.now() + 1 * 86400000),
            cpf: "50505050505",
        })
        const idPending3 = await createAppointment({
            name: "Pending -1d",
            status: "PENDING",
            appointmentDatetime: new Date(Date.now() - 1 * 86400000),
            cpf: "60606060606",
        })

        const resPending = await request(app)
            .get("/api/v1/appointments?status=PENDING&period=all&limit=100")
            .set("Cookie", adminCookie)
        expect(resPending.status).toBe(200)
        const pendingItems = resPending.body.data.items.filter((i: { id: string }) =>
            [String(idPending1), String(idPending2), String(idPending3)].includes(i.id),
        )
        expect(pendingItems.map((i: { id: string }) => i.id)).toEqual([
            String(idPending3),
            String(idPending2),
            String(idPending1),
        ])
    })

    it("concorrência entre Atendido e Não compareceu grava apenas um evento terminal e devolve 409 para o segundo", async () => {
        const todayPastTime = new Date(Date.now() - 3600000)
        const apptId = await createAppointment({
            name: "Cidadão Concorrente",
            status: "PENDING",
            appointmentDatetime: todayPastTime,
            cpf: "55588822233",
        })

        const pool = getPool()
        const lockClient = await pool.connect()
        try {
            await lockClient.query("BEGIN")
            await lockClient.query("SELECT id FROM Appointments WHERE id = $1 FOR UPDATE", [apptId])

            const reqAttended = request(app)
                .patch(`/api/v1/appointments/${apptId}/status`)
                .set("Origin", ORIGIN)
                .set("Cookie", adminCookie)
                .send({ action: "attended" })

            const reqNoShow = request(app)
                .patch(`/api/v1/appointments/${apptId}/status`)
                .set("Origin", ORIGIN)
                .set("Cookie", adminCookie)
                .send({ action: "no_show" })

            await new Promise((resolve) => setTimeout(resolve, 80))
            await lockClient.query("COMMIT")

            const [resAttended, resNoShow] = await Promise.all([reqAttended, reqNoShow])

            const statuses = [resAttended.status, resNoShow.status].sort()
            expect(statuses).toEqual([200, 409])
        } finally {
            lockClient.release()
        }

        const eventsRes = await pool.query<{ type: string }>(
            `SELECT type FROM AppointmentEvents
             WHERE appointment_id = $1 AND type IN ('ATTENDED', 'NO_SHOW')`,
            [apptId],
        )
        expect(eventsRes.rows).toHaveLength(1)
    })

    it("concorrência ao assumir (claim) devolve 409 para o segundo atendente", async () => {
        const apptId = await createAppointment({
            name: "Cidadão Claim Concorrente",
            status: "PENDING",
            cpf: "66699933344",
        })

        const pool = getPool()
        const lockClient = await pool.connect()
        try {
            await lockClient.query("BEGIN")
            await lockClient.query("SELECT id FROM Appointments WHERE id = $1 FOR UPDATE", [apptId])

            const reqA = request(app)
                .patch(`/api/v1/appointments/${apptId}/status`)
                .set("Origin", ORIGIN)
                .set("Cookie", adminCookie)
                .send({ action: "claim" })

            const reqB = request(app)
                .patch(`/api/v1/appointments/${apptId}/status`)
                .set("Origin", ORIGIN)
                .set("Cookie", adminCookie)
                .send({ action: "claim" })

            await new Promise((resolve) => setTimeout(resolve, 80))
            await lockClient.query("COMMIT")

            const [resA, resB] = await Promise.all([reqA, reqB])

            const statuses = [resA.status, resB.status].sort()
            expect(statuses).toEqual([200, 409])

            const conflictRes = resA.status === 409 ? resA : resB
            expect(conflictRes.body.error.code).toBe("APPOINTMENT_ALREADY_CLAIMED")
        } finally {
            lockClient.release()
        }

        const eventsRes = await pool.query<{ type: string }>(
            `SELECT type FROM AppointmentEvents
             WHERE appointment_id = $1 AND type = 'CLAIMED'`,
            [apptId],
        )
        expect(eventsRes.rows).toHaveLength(1)
    })

    it("o PATCH devolve a linha do tempo da conversa e o histórico com a ação nova", async () => {
        const pool = getPool()
        await insertConversationEvent(pool, String(sessionId), { type: "STARTED" })
        await insertConversationEvent(pool, String(sessionId), { type: "CATEGORY_CHOSEN", categoryId })
        const apptId = await createAppointment({ name: "Cidadão Linha do Tempo", cpf: "77711144455" })

        const res = await request(app)
            .patch(`/api/v1/appointments/${apptId}/status`)
            .set("Origin", ORIGIN)
            .set("Cookie", adminCookie)
            .send({ action: "claim" })

        expect(res.status).toBe(200)
        expect(res.body.data.timeline.length).toBeGreaterThan(0)
        expect(res.body.data.events[0].type).toBe("CLAIMED")
    })

    it("o histórico mostra o ATTENDED antes do CLAIMED automático gravado no mesmo instante", async () => {
        const apptId = await createAppointment({
            name: "Cidadão Histórico",
            status: "PENDING",
            appointmentDatetime: new Date(Date.now() - 60000),
            cpf: "88822255566",
        })

        const res = await request(app)
            .patch(`/api/v1/appointments/${apptId}/status`)
            .set("Origin", ORIGIN)
            .set("Cookie", adminCookie)
            .send({ action: "attended" })

        expect(res.status).toBe(200)
        expect(res.body.data.events.map((e: { type: string }) => e.type)).toEqual(["ATTENDED", "CLAIMED"])
    })

    it("retorna 400 para id não numérico ou acima do limite de bigint", async () => {
        const resText = await request(app)
            .get("/api/v1/appointments/abc")
            .set("Cookie", adminCookie)
        expect(resText.status).toBe(400)
        expect(resText.body.error.code).toBe("BAD_REQUEST")

        const resOverflow = await request(app)
            .get("/api/v1/appointments/999999999999999999999999999")
            .set("Cookie", adminCookie)
        expect(resOverflow.status).toBe(400)
        expect(resOverflow.body.error.code).toBe("BAD_REQUEST")
    })
})
