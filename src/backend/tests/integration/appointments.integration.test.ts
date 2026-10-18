import { createHmac } from "node:crypto"
import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import app from "../../app"
import getPool from "../../db/connection"
import { insertConversationEvent } from "../../repositories/conversationEvent.repository"
import {
    createTestAppointment,
    firstRow,
    loginAdmin,
    TestAppointmentOverrides,
    TestAppointmentScope,
} from "./helpers/appointmentsDb"

const ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173"

describe("Agendamentos com Postgres (integração)", () => {
    let createdAdminId: number | null = null
    let categoryId: number
    let questionId: number
    let sessionId: number

    let adminCookie: string
    let scope: TestAppointmentScope

    const createdAppointmentIds: number[] = []
    const createdUserIds: number[] = []

    beforeAll(async () => {
        const pool = getPool()

        const login = await loginAdmin()
        adminCookie = login.adminCookie
        createdAdminId = login.createdAdminId

        const catRes = await pool.query<{ id: string }>(
            `INSERT INTO Categories (title, short_title, position, seed_key)
             VALUES ('Categoria Integracao', 'Cat Int', 99, 'cat_integration_test')
             RETURNING id`,
        )
        categoryId = Number(firstRow(catRes.rows).id)

        const qRes = await pool.query<{ id: string }>(
            `INSERT INTO Questions (category_id, question, short_title, answer, requires_in_person, out_of_scope, llm_allowed, position, seed_key)
             VALUES ($1, 'Pergunta Integracao', 'Perg Int', 'Resposta teste', true, false, false, 0, 'q_integration_test')
             RETURNING id`,
            [categoryId],
        )
        questionId = Number(firstRow(qRes.rows).id)

        const sessRes = await pool.query<{ id: string }>(
            `INSERT INTO Sessions (phone_hash, status, outcome, current_step)
             VALUES ('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', 'FINISHED', 'SCHEDULED', 'FINISHED')
             RETURNING id`,
        )
        sessionId = Number(firstRow(sessRes.rows).id)

        scope = { sessionId, questionId, adminUserId: login.adminUserId, createdAppointmentIds }
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
        if (createdUserIds.length > 0) {
            await pool.query(`DELETE FROM Users WHERE id = ANY($1::bigint[])`, [createdUserIds])
        }
        await pool.end()
    })

    function createAppointment(overrides: TestAppointmentOverrides): Promise<number> {
        return createTestAppointment(scope, overrides)
    }

    async function listOrderAcrossPages(query: string, ids: number[]): Promise<string[]> {
        const wanted = ids.map(String)
        const found: string[] = []
        let page = 1
        let totalPages = 1
        do {
            const res = await request(app)
                .get(`/api/v1/appointments?${query}&limit=100&page=${page}`)
                .set("Cookie", adminCookie)
            expect(res.status).toBe(200)
            for (const item of res.body.data.items as { id: string }[]) {
                if (wanted.includes(item.id)) {
                    found.push(item.id)
                }
            }
            totalPages = res.body.data.totalPages
            page++
        } while (page <= totalPages)
        return found
    }

    it("busca por CPF com hash HMAC encontra agendamento digitado com e sem pontuação", async () => {
        const cpfDigits = "52998224725"
        const cpfHash = createHmac("sha256", process.env.CPF_HASH_SECRET as string)
            .update(cpfDigits, "utf8")
            .digest("hex")
        const id = await createAppointment({ name: "Maria CPF HMAC", cpf: cpfDigits, cpfHash })

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

        const canceledOrder = await listOrderAcrossPages("status=CANCELED&period=all", [
            idCanceled1,
            idCanceled2,
            idCanceled3,
        ])
        expect(canceledOrder).toEqual([
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

        const pendingOrder = await listOrderAcrossPages("status=PENDING&period=all", [
            idPending1,
            idPending2,
            idPending3,
        ])
        expect(pendingOrder).toEqual([
            String(idPending3),
            String(idPending2),
            String(idPending1),
        ])
    })

    it("ordena period=all sem status com os próximos primeiro e os passados do mais recente ao mais antigo", async () => {
        const idFarFuture = await createAppointment({
            name: "Ordem +2d",
            status: "CONFIRMED",
            appointmentDatetime: new Date(Date.now() + 2 * 86400000),
            cpf: "11122233300",
        })
        const idNearFuture = await createAppointment({
            name: "Ordem +1d",
            status: "CONFIRMED",
            appointmentDatetime: new Date(Date.now() + 1 * 86400000),
            cpf: "11122233311",
        })
        const idRecentPast = await createAppointment({
            name: "Ordem -1d",
            status: "CONFIRMED",
            appointmentDatetime: new Date(Date.now() - 1 * 86400000),
            cpf: "11122233322",
        })
        const idOldPast = await createAppointment({
            name: "Ordem -2d",
            status: "CONFIRMED",
            appointmentDatetime: new Date(Date.now() - 2 * 86400000),
            cpf: "11122233333",
        })

        const order = await listOrderAcrossPages("period=all", [
            idFarFuture,
            idNearFuture,
            idRecentPast,
            idOldPast,
        ])

        expect(order).toEqual([
            String(idNearFuture),
            String(idFarFuture),
            String(idRecentPast),
            String(idOldPast),
        ])
    })

    it("ordena o resultado da busca com os próximos primeiro e os passados do mais recente ao mais antigo", async () => {
        const idFarFuture = await createAppointment({
            name: "Zeta Busca Ordem +2d",
            status: "CONFIRMED",
            appointmentDatetime: new Date(Date.now() + 2 * 86400000),
            cpf: "33344455500",
        })
        const idNearFuture = await createAppointment({
            name: "Zeta Busca Ordem +1d",
            status: "CONFIRMED",
            appointmentDatetime: new Date(Date.now() + 1 * 86400000),
            cpf: "33344455511",
        })
        const idRecentPast = await createAppointment({
            name: "Zeta Busca Ordem -1d",
            status: "CANCELED",
            appointmentDatetime: new Date(Date.now() - 1 * 86400000),
            cpf: "33344455522",
        })
        const idOldPast = await createAppointment({
            name: "Zeta Busca Ordem -2d",
            status: "CONFIRMED",
            appointmentDatetime: new Date(Date.now() - 2 * 86400000),
            cpf: "33344455533",
        })

        const order = await listOrderAcrossPages("search=Zeta%20Busca%20Ordem", [
            idFarFuture,
            idNearFuture,
            idRecentPast,
            idOldPast,
        ])

        expect(order).toEqual([
            String(idNearFuture),
            String(idFarFuture),
            String(idRecentPast),
            String(idOldPast),
        ])
    })

    it("ordena por responsável com os sem responsável primeiro no crescente e por último no decrescente", async () => {
        const idUnassigned = await createAppointment({
            name: "Sem responsável",
            status: "PENDING",
            appointmentDatetime: new Date(Date.now() + 86400000),
            cpf: "22233344400",
        })
        const idAssigned = await createAppointment({
            name: "Com responsável",
            status: "CONFIRMED",
            appointmentDatetime: new Date(Date.now() + 86400000),
            cpf: "22233344411",
        })
        const ids = [idUnassigned, idAssigned]

        const ascending = await listOrderAcrossPages("period=all&sortBy=responsible&sortOrder=asc", ids)
        const descending = await listOrderAcrossPages("period=all&sortBy=responsible&sortOrder=desc", ids)

        expect(ascending).toEqual([String(idUnassigned), String(idAssigned)])
        expect(descending).toEqual([String(idAssigned), String(idUnassigned)])
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

            const attendedWon = resAttended.status === 200
            const conflictRes = attendedWon ? resNoShow : resAttended
            expect(conflictRes.body.error.code).toBe(attendedWon ? "ALREADY_ATTENDED" : "ALREADY_NO_SHOW")
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

    it.each([
        { action: "attended", terminalEvent: "ATTENDED", cpf: "99933366677" },
        { action: "no_show", terminalEvent: "NO_SHOW", cpf: "99933366688" },
    ])(
        "o PATCH $action devolve a linha do tempo da conversa e o histórico igual ao do GET",
        async ({ action, terminalEvent, cpf }) => {
            const pool = getPool()
            await insertConversationEvent(pool, String(sessionId), { type: "STARTED" })
            await insertConversationEvent(pool, String(sessionId), { type: "CATEGORY_CHOSEN", categoryId })
            const apptId = await createAppointment({
                name: "Cidadão Ação Terminal",
                status: "CONFIRMED",
                appointmentDatetime: new Date(Date.now() - 3600000),
                cpf,
            })

            const patchRes = await request(app)
                .patch(`/api/v1/appointments/${apptId}/status`)
                .set("Origin", ORIGIN)
                .set("Cookie", adminCookie)
                .send({ action })
            const getRes = await request(app)
                .get(`/api/v1/appointments/${apptId}`)
                .set("Cookie", adminCookie)

            expect(patchRes.status).toBe(200)
            expect(patchRes.body.data.timeline.length).toBeGreaterThan(0)
            expect(patchRes.body.data.events[0].type).toBe(terminalEvent)
            expect(patchRes.body.data.timeline).toEqual(getRes.body.data.timeline)
            expect(patchRes.body.data.events).toEqual(getRes.body.data.events)
        },
    )

    it("a linha do tempo usa o mesmo título de categoria e pergunta do detalhe", async () => {
        const pool = getPool()
        await insertConversationEvent(pool, String(sessionId), { type: "CATEGORY_CHOSEN", categoryId })
        await insertConversationEvent(pool, String(sessionId), { type: "QUESTION_CHOSEN", categoryId, questionId })
        const apptId = await createAppointment({ name: "Cidadão Títulos", cpf: "99933366677" })

        const res = await request(app)
            .get(`/api/v1/appointments/${apptId}`)
            .set("Cookie", adminCookie)

        expect(res.status).toBe(200)
        expect(res.body.data.category_name).toBe("Categoria Integracao")
        const steps: { type: string; data: Record<string, unknown> }[] = res.body.data.timeline
        const categorySteps = steps.filter((step) => step.type === "CATEGORY_CHOSEN")
        const questionSteps = steps.filter((step) => step.type === "QUESTION_CHOSEN")
        expect(categorySteps.length).toBeGreaterThan(0)
        expect(questionSteps.length).toBeGreaterThan(0)
        for (const step of [...categorySteps, ...questionSteps]) {
            expect(step.data.category_title).toBe(res.body.data.category_name)
        }
        for (const step of questionSteps) {
            expect(step.data.question_title).toBe(res.body.data.question_title)
        }
    })

    it("o protocolo vem em maiúsculas na lista e no detalhe, igual ao que o bot envia", async () => {
        const apptId = await createAppointment({ name: "Cidadão Protocolo Maiúsculo", cpf: "10120230344" })
        const codeRes = await getPool().query<{ appointment_code: string }>(
            "SELECT appointment_code::text AS appointment_code FROM Appointments WHERE id = $1",
            [apptId],
        )
        const botProtocol = firstRow(codeRes.rows).appointment_code.slice(0, 8).toUpperCase()

        const detailRes = await request(app)
            .get(`/api/v1/appointments/${apptId}`)
            .set("Cookie", adminCookie)
        const listRes = await request(app)
            .get(`/api/v1/appointments?search=${botProtocol}`)
            .set("Cookie", adminCookie)

        expect(detailRes.body.data.protocol).toMatch(/^[0-9A-F]{8}$/)
        expect(detailRes.body.data.protocol).toBe(botProtocol)
        const listed = listRes.body.data.items.find((item: { id: string }) => item.id === String(apptId))
        expect(listed.protocol).toBe(botProtocol)
    })

    it("conta os chips respeitando período e responsável, e Aguardando registro só pelo responsável", async () => {
        const pool = getPool()
        const userRes = await pool.query<{ id: string }>(
            `INSERT INTO Users (name, email, password_hash, is_admin, active, session_version)
             VALUES ('Atendente Chips', $1, 'hash', false, true, 0)
             RETURNING id`,
            [`chips.integration-${process.pid}-${Date.now()}@teste.local`],
        )
        const userId = Number(firstRow(userRes.rows).id)
        createdUserIds.push(userId)
        const day = 86400000
        await createAppointment({ name: "Chip Confirmado Futuro", status: "CONFIRMED", assignedUserId: userId, appointmentDatetime: new Date(Date.now() + day), cpf: "11122233396" })
        await createAppointment({ name: "Chip Cancelado Futuro", status: "CANCELED", assignedUserId: userId, appointmentDatetime: new Date(Date.now() + 2 * day), cpf: "11122233396" })
        await createAppointment({ name: "Chip Confirmado Passado", status: "CONFIRMED", assignedUserId: userId, appointmentDatetime: new Date(Date.now() - 3 * day), cpf: "11122233396" })
        await createAppointment({ name: "Chip Faltou Passado", status: "NO_SHOW", assignedUserId: userId, appointmentDatetime: new Date(Date.now() - 2 * day), cpf: "11122233396" })
        await createAppointment({ name: "Chip Pendente Outro", status: "PENDING", appointmentDatetime: new Date(Date.now() + day), cpf: "11122233396" })

        const upcoming = await request(app)
            .get(`/api/v1/appointments?period=upcoming&responsible=${userId}`)
            .set("Cookie", adminCookie)
        const past = await request(app)
            .get(`/api/v1/appointments?period=past&responsible=${userId}&status=NO_SHOW`)
            .set("Cookie", adminCookie)
        const searching = await request(app)
            .get(`/api/v1/appointments?period=upcoming&responsible=${userId}&search=Chip`)
            .set("Cookie", adminCookie)

        const upcomingChips = { all: 2, pending: 0, confirmed: 1, attended: 0, no_show: 0, canceled: 1, waiting_record: 1 }
        expect(upcoming.body.data.chipCounts).toEqual(upcomingChips)
        expect(past.body.data.chipCounts).toEqual({ all: 2, pending: 0, confirmed: 1, attended: 0, no_show: 1, canceled: 0, waiting_record: 1 })
        expect(searching.body.data.chipCounts).toEqual(upcomingChips)
    })

    it("a lista e o detalhe do Postgres têm exatamente as chaves do contrato", async () => {
        const apptId = await createAppointment({ name: "Cidadão Contrato Chaves", cpf: "12312312387" })

        const listRes = await request(app)
            .get("/api/v1/appointments?search=Contrato%20Chaves")
            .set("Cookie", adminCookie)
        const detailRes = await request(app)
            .get(`/api/v1/appointments/${apptId}`)
            .set("Cookie", adminCookie)

        const item = listRes.body.data.items.find((i: { id: string }) => i.id === String(apptId))
        expect(Object.keys(item).sort()).toEqual([
            "appointment_code",
            "appointment_datetime",
            "assigned_user_id",
            "assigned_user_name",
            "by_representative",
            "category_name",
            "cpf_masked",
            "id",
            "name",
            "off_grid",
            "protocol",
            "question_title",
            "status",
            "waiting_record",
        ])
        expect(Object.keys(detailRes.body.data).sort()).toEqual([
            "appointment_code",
            "appointment_datetime",
            "assigned_user_id",
            "assigned_user_name",
            "available_actions",
            "by_representative",
            "category_id",
            "category_name",
            "cpf_masked",
            "documents_sent",
            "events",
            "id",
            "is_documents_config_different",
            "name",
            "off_grid",
            "protocol",
            "question_id",
            "question_title",
            "reason",
            "request_datetime",
            "rescheduled_from",
            "session_id",
            "status",
            "timeline",
        ])
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
