import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import app from "../../app"
import getPool from "../../db/connection"
import { insertConversationEvent } from "../../repositories/conversationEvent.repository"
import type { AbandonedStep } from "../../types/conversationEvent.types"
import type { SessionOutcome } from "../../types/session.types"
import {
    addDaysToDateString,
    parseLocalDate,
    toLocalDateString,
} from "../../utils/date.utils"
import { hashPhone as phoneHash } from "./helpers/phone"
import { createTestUser, deleteTestUsers, TestUser } from "./helpers/usersDb"

const ORIGIN = process.env.FRONTEND_ORIGIN as string
const PHONE_PREFIX = "5512966660"

interface SessionItem {
    code: string
    outcome: string
    category_name: string | null
    current_step: string | null
    appointment: { protocol: string; action: string | null } | null
}

interface ListBody {
    data: {
        items: SessionItem[]
        total: number
        page: number
        limit: number
        totalPages: number
        chipCounts: Record<string, number>
        range: { from: string; to: string }
        categories: { id: number; name: string }[]
    }
}

describe("Sessions integration tests (Postgres)", () => {
    const createdUserIds: (number | null)[] = []
    const createdSessionIds: string[] = []
    const createdAppointmentIds: string[] = []
    const createdQuestionIds: number[] = []
    const createdCategoryIds: number[] = []
    const codes = new Map<string, string>()
    const phones = new Map<string, string>()

    let viewer: TestUser
    let outsider: TestUser

    let catAId: number
    let catBId: number
    let catRelId: number
    let qA1Id: number
    let qB1Id: number
    let qRelId: number
    let appointmentId: string
    let protocol: string

    const today = toLocalDateString(new Date())

    async function user(permissions: Parameters<typeof createTestUser>[0]): Promise<TestUser> {
        const created = await createTestUser(permissions)
        createdUserIds.push(created.createdId)
        return created
    }

    let phoneCounter = 0

    async function insertSession(params: {
        key: string
        startedAt: Date
        outcome: SessionOutcome
        phoneKey?: string
        anonymized?: boolean
        abandonedStep?: AbandonedStep
    }): Promise<string> {
        const pool = getPool()
        const status =
            params.outcome === "IN_PROGRESS"
                ? "IN_PROGRESS"
                : params.outcome === "ABANDONED"
                  ? "ABANDONED"
                  : "FINISHED"
        const currentStep = status === "IN_PROGRESS" ? "AWAITING_CATEGORY" : "FINISHED"
        const endedAt =
            status === "IN_PROGRESS" ? null : new Date(params.startedAt.getTime() + 10 * 60_000)
        const phoneKey = params.phoneKey ?? params.key
        if (!phones.has(phoneKey)) {
            phoneCounter += 1
            phones.set(phoneKey, `${PHONE_PREFIX}${String(phoneCounter).padStart(3, "0")}`)
        }
        const hash = params.anonymized ? null : phoneHash(phones.get(phoneKey)!)
        const res = await pool.query<{ id: string; code: string }>(
            `INSERT INTO Sessions (phone_hash, status, outcome, current_step, abandoned_at_step,
                                   started_at, last_interaction_at, ended_at, anonymized_at)
             VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8)
             RETURNING id, session_code::text AS code`,
            [
                hash,
                status,
                params.outcome,
                currentStep,
                params.abandonedStep ?? null,
                params.startedAt,
                endedAt,
                params.anonymized ? new Date() : null,
            ],
        )
        const id = String(res.rows[0]!.id)
        createdSessionIds.push(id)
        codes.set(params.key, res.rows[0]!.code)
        return id
    }

    async function chooseCategory(sessionId: string, categoryId: number, questionId?: number) {
        const pool = getPool()
        await insertConversationEvent(pool, sessionId, { type: "CATEGORY_CHOSEN", categoryId })
        if (questionId) {
            await insertConversationEvent(pool, sessionId, {
                type: "QUESTION_CHOSEN",
                categoryId,
                questionId,
            })
        }
    }

    async function insertAppointment(sessionId: string, questionId: number): Promise<{ id: string; protocol: string }> {
        const pool = getPool()
        const res = await pool.query<{ id: string; protocol: string }>(
            `INSERT INTO Appointments (session_id, question_id, reason, name, cpf_hash, cpf_masked,
                                       by_representative, documents_sent, appointment_datetime,
                                       status, request_datetime)
             VALUES ($1, $2, 'REQUIRES_IN_PERSON', 'Cidadão Sessões Teste', $3, '***.123.456-**', false,
                     '{"group":[],"question":[]}'::jsonb, $4, 'PENDING', $5)
             RETURNING id, UPPER(SUBSTRING(appointment_code::text, 1, 8)) AS protocol`,
            [
                sessionId,
                questionId,
                "b".repeat(64),
                parseLocalDate("2021-06-01", "10:00"),
                parseLocalDate("2021-05-11", "10:00"),
            ],
        )
        const row = res.rows[0]!
        createdAppointmentIds.push(String(row.id))
        return { id: String(row.id), protocol: row.protocol }
    }

    async function cleanup(): Promise<void> {
        const pool = getPool()
        if (createdSessionIds.length > 0) {
            await pool.query("DELETE FROM ConversationEvents WHERE session_id = ANY($1::bigint[])", [createdSessionIds])
        }
        if (createdAppointmentIds.length > 0) {
            await pool.query("DELETE FROM AppointmentEvents WHERE appointment_id = ANY($1::bigint[])", [createdAppointmentIds])
            await pool.query("DELETE FROM Appointments WHERE id = ANY($1::bigint[])", [createdAppointmentIds])
        }
        if (createdSessionIds.length > 0) {
            await pool.query("DELETE FROM Sessions WHERE id = ANY($1::bigint[])", [createdSessionIds])
        }
        if (createdQuestionIds.length > 0) {
            await pool.query("DELETE FROM Questions WHERE id = ANY($1::bigint[])", [createdQuestionIds])
        }
        if (createdCategoryIds.length > 0) {
            await pool.query("DELETE FROM Categories WHERE id = ANY($1::bigint[])", [createdCategoryIds])
        }
    }

    async function list(query: string, as: TestUser = viewer): Promise<ListBody["data"]> {
        const res = await request(app)
            .get(`/api/v1/sessions?${query}`)
            .set("Origin", ORIGIN)
            .set("Cookie", as.cookie)
        expect(res.status).toBe(200)
        return (res.body as ListBody).data
    }

    function codesOf(items: SessionItem[]): string[] {
        return items.map((item) => item.code)
    }

    function localNoon(dateStr: string): Date {
        return parseLocalDate(dateStr, "12:00")
    }

    beforeAll(async () => {
        const pool = getPool()
        viewer = await user({ permissions: ["sessions.view"] })
        outsider = await user({ permissions: ["appointments.view"] })

        async function category(title: string, shortTitle: string, position: number): Promise<number> {
            const res = await pool.query<{ id: number }>(
                "INSERT INTO Categories (title, short_title, position) VALUES ($1, $2, $3) RETURNING id",
                [title, shortTitle, position],
            )
            const id = Number(res.rows[0]!.id)
            createdCategoryIds.push(id)
            return id
        }
        async function question(categoryId: number, text: string): Promise<number> {
            const res = await pool.query<{ id: number }>(
                `INSERT INTO Questions (category_id, question, answer, short_title, position, out_of_scope, requires_in_person, llm_allowed)
                 VALUES ($1, $2, 'Resposta', 'Curto', 1, false, false, false) RETURNING id`,
                [categoryId, text],
            )
            const id = Number(res.rows[0]!.id)
            createdQuestionIds.push(id)
            return id
        }

        catAId = await category("Sessões Cat A Teste", "CatA", 901)
        catBId = await category("Sessões Cat B Teste", "CatB", 902)
        catRelId = await category("Sessões Cat Rel Teste", "CatRel", 903)
        qA1Id = await question(catAId, "Pergunta A1 Sessões")
        qB1Id = await question(catBId, "Pergunta B1 Sessões")
        qRelId = await question(catRelId, "Pergunta Rel Sessões")

        const s1 = await insertSession({ key: "s1", startedAt: parseLocalDate("2021-05-10", "00:30"), outcome: "RESOLVED" })
        await chooseCategory(s1, catAId, qA1Id)

        const s2 = await insertSession({ key: "s2", startedAt: parseLocalDate("2021-05-11", "10:00"), outcome: "SCHEDULED" })
        await chooseCategory(s2, catAId, qA1Id)
        const appointment = await insertAppointment(s2, qA1Id)
        appointmentId = appointment.id
        protocol = appointment.protocol
        await insertConversationEvent(pool, s2, {
            type: "APPOINTMENT_CREATED",
            appointmentId: Number(appointmentId),
        })

        const s3 = await insertSession({ key: "s3", startedAt: parseLocalDate("2021-05-12", "09:00"), outcome: "SCHEDULED" })
        await chooseCategory(s3, catBId, qB1Id)

        const sRet = await insertSession({
            key: "sRet",
            phoneKey: "s2",
            startedAt: parseLocalDate("2021-05-13", "15:00"),
            outcome: "MANAGED_APPOINTMENT",
        })
        await insertConversationEvent(pool, sRet, {
            type: "APPOINTMENT_CONSULTED",
            appointmentId: Number(appointmentId),
        })
        await insertConversationEvent(pool, sRet, {
            type: "APPOINTMENT_RESCHEDULED",
            appointmentId: Number(appointmentId),
            from: "2021-06-01T13:00:00.000Z",
            to: "2021-06-02T13:00:00.000Z",
        })

        const sAband = await insertSession({
            key: "sAband",
            startedAt: parseLocalDate("2021-05-13", "08:00"),
            outcome: "ABANDONED",
            abandonedStep: "AWAITING_CATEGORY",
        })
        await chooseCategory(sAband, catAId)

        const sInProg = await insertSession({
            key: "sInProg",
            startedAt: parseLocalDate("2021-05-13", "09:00"),
            outcome: "IN_PROGRESS",
        })
        await chooseCategory(sInProg, catAId)

        const sAnon = await insertSession({
            key: "sAnon",
            startedAt: parseLocalDate("2021-05-12", "16:00"),
            outcome: "RESOLVED",
            anonymized: true,
        })
        await chooseCategory(sAnon, catAId, qA1Id)

        const sEdgeEnd = await insertSession({
            key: "sEdgeEnd",
            startedAt: parseLocalDate("2021-05-14", "23:30"),
            outcome: "NO_SLOT",
        })
        await chooseCategory(sEdgeEnd, catAId)

        const sEdgeBefore = await insertSession({
            key: "sEdgeBefore",
            startedAt: parseLocalDate("2021-05-09", "23:30"),
            outcome: "RESOLVED",
        })
        await chooseCategory(sEdgeBefore, catAId)

        const sOut = await insertSession({ key: "sOut", startedAt: parseLocalDate("2021-05-01", "10:00"), outcome: "RESOLVED" })
        await chooseCategory(sOut, catAId)

        for (let index = 0; index < 25; index += 1) {
            const id = await insertSession({
                key: `bulk${index}`,
                startedAt: parseLocalDate("2020-03-10", `${String(8 + Math.floor(index / 2)).padStart(2, "0")}:${index % 2 ? "30" : "00"}`),
                outcome: "RESOLVED",
            })
            await chooseCategory(id, catBId)
        }

        const relative: [string, number][] = [
            ["rel0", 0],
            ["rel6", 6],
            ["rel7", 7],
            ["rel29", 29],
            ["rel30", 30],
            ["rel89", 89],
            ["rel90", 90],
        ]
        for (const [key, daysAgo] of relative) {
            const id = await insertSession({
                key,
                startedAt: localNoon(addDaysToDateString(today, -daysAgo)),
                outcome: "RESOLVED",
            })
            await chooseCategory(id, catRelId, qRelId)
        }
        const firstOfMonth = `${today.slice(0, 8)}01`
        const previousLast = addDaysToDateString(firstOfMonth, -1)
        const relMonthStart = await insertSession({
            key: "relMonthStart",
            startedAt: parseLocalDate(firstOfMonth, "00:10"),
            outcome: "RESOLVED",
        })
        await chooseCategory(relMonthStart, catRelId)
        const relPrevLast = await insertSession({
            key: "relPrevLast",
            startedAt: parseLocalDate(previousLast, "23:50"),
            outcome: "RESOLVED",
        })
        await chooseCategory(relPrevLast, catRelId)
        const relPrevFirst = await insertSession({
            key: "relPrevFirst",
            startedAt: parseLocalDate(`${previousLast.slice(0, 8)}01`, "00:10"),
            outcome: "RESOLVED",
        })
        await chooseCategory(relPrevFirst, catRelId)
    })

    afterAll(async () => {
        try {
            await cleanup()
        } finally {
            try {
                await deleteTestUsers(createdUserIds)
            } finally {
                await getPool().end()
            }
        }
    })

    const code = (key: string) => codes.get(key)!

    it("restringe a lista e o detalhe a contas autenticadas com a permissão sessions.view", async () => {
        const unauthList = await request(app).get("/api/v1/sessions").set("Origin", ORIGIN)
        expect(unauthList.status).toBe(401)
        const forbiddenList = await request(app)
            .get("/api/v1/sessions")
            .set("Origin", ORIGIN)
            .set("Cookie", outsider.cookie)
        expect(forbiddenList.status).toBe(403)

        const unauthDetail = await request(app).get(`/api/v1/sessions/${code("s1")}`).set("Origin", ORIGIN)
        expect(unauthDetail.status).toBe(401)
        const forbiddenDetail = await request(app)
            .get(`/api/v1/sessions/${code("s1")}`)
            .set("Origin", ORIGIN)
            .set("Cookie", outsider.cookie)
        expect(forbiddenDetail.status).toBe(403)

        const allowed = await request(app)
            .get("/api/v1/sessions?period=custom&from=2021-05-10&to=2021-05-14")
            .set("Origin", ORIGIN)
            .set("Cookie", viewer.cookie)
        expect(allowed.status).toBe(200)
    })

    it("rejeita filtros inválidos, inclusive o período 'all' que não existe", async () => {
        for (const query of ["period=all", "outcome=INVENTADO", "limit=101", "page=0", "period=custom&from=10/05/2021"]) {
            const res = await request(app)
                .get(`/api/v1/sessions?${query}`)
                .set("Origin", ORIGIN)
                .set("Cookie", viewer.cookie)
            expect(res.status, query).toBe(400)
        }
    })

    it("filtra por período personalizado usando o fuso de Brasília nas duas pontas", async () => {
        const data = await list(`period=custom&from=2021-05-10&to=2021-05-14&category=${catAId}&limit=100`)
        const found = codesOf(data.items)
        expect(found).toContain(code("s1"))
        expect(found).toContain(code("sEdgeEnd"))
        expect(found).not.toContain(code("sEdgeBefore"))
        expect(found).not.toContain(code("sOut"))
    })

    it("conta os chips de desfecho dentro do período e da categoria, sem aplicar o desfecho escolhido", async () => {
        const data = await list(
            `period=custom&from=2021-05-10&to=2021-05-14&category=${catAId}&outcome=RESOLVED&limit=100`,
        )
        expect(data.total).toBe(2)
        expect(codesOf(data.items).sort()).toEqual([code("s1"), code("sAnon")].sort())
        expect(data.range).toEqual({ from: "2021-05-10", to: "2021-05-14" })
        expect(data.chipCounts).toEqual({
            all: 7,
            resolved: 2,
            scheduled: 1,
            out_of_scope: 0,
            no_slot: 1,
            declined: 0,
            managed_appointment: 1,
            abandoned: 1,
            in_progress: 1,
        })
    })

    it("filtra por desfecho e mostra a etapa atual só nas conversas em andamento", async () => {
        const inProgress = await list(
            `period=custom&from=2021-05-10&to=2021-05-14&category=${catAId}&outcome=IN_PROGRESS`,
        )
        expect(codesOf(inProgress.items)).toEqual([code("sInProg")])
        expect(inProgress.items[0]!.current_step).toBe("AWAITING_CATEGORY")

        const abandoned = await list(
            `period=custom&from=2021-05-10&to=2021-05-14&category=${catAId}&outcome=ABANDONED`,
        )
        expect(codesOf(abandoned.items)).toEqual([code("sAband")])
        expect(abandoned.items[0]!.current_step).toBeNull()
    })

    it("filtra por categoria, incluindo as conversas de retorno cujo agendamento é da categoria", async () => {
        const catA = await list(`period=custom&from=2021-05-10&to=2021-05-14&category=${catAId}&limit=100`)
        expect(codesOf(catA.items)).toContain(code("sRet"))
        expect(codesOf(catA.items)).not.toContain(code("s3"))

        const returning = catA.items.find((item) => item.code === code("sRet"))!
        expect(returning.category_name).toBe("Sessões Cat A Teste")
        expect(returning.appointment).toEqual({ id: appointmentId, protocol, action: "RESCHEDULED" })

        const catB = await list(`period=custom&from=2021-05-10&to=2021-05-14&category=${catBId}&limit=100`)
        expect(codesOf(catB.items)).toEqual([code("s3")])
        expect(catB.categories.map((item) => item.id)).toEqual(expect.arrayContaining([catAId, catBId]))
    })

    it("busca por código da sessão ignorando período, categoria e desfecho", async () => {
        const data = await list(
            `search=${encodeURIComponent(code("s1").toLowerCase())}&period=7&category=${catBId}&outcome=ABANDONED`,
        )
        expect(codesOf(data.items)).toEqual([code("s1")])
        expect(data.total).toBe(1)
        expect(data.chipCounts.all).toBe(1)
    })

    it("busca por protocolo e encontra a conversa que criou e a de retorno que remarcou", async () => {
        const data = await list(`search=${protocol.toLowerCase()}&period=7&outcome=ABANDONED`)
        expect(codesOf(data.items).sort()).toEqual([code("s2"), code("sRet")].sort())
        const creator = data.items.find((item) => item.code === code("s2"))!
        expect(creator.appointment?.action).toBe("CREATED")
        const returning = data.items.find((item) => item.code === code("sRet"))!
        expect(returning.appointment?.action).toBe("RESCHEDULED")
    })

    it("devolve lista vazia, sem erro, quando a busca não encontra nada", async () => {
        const data = await list("search=ZZZZZZZZ-INEXISTENTE")
        expect(data.items).toEqual([])
        expect(data.total).toBe(0)
        expect(data.totalPages).toBe(0)
    })

    it("pagina de 20 em 20 da mais recente para a mais antiga", async () => {
        const first = await list(`period=custom&from=2020-03-10&to=2020-03-10&category=${catBId}&page=1`)
        expect(first.limit).toBe(20)
        expect(first.total).toBe(25)
        expect(first.totalPages).toBe(2)
        expect(first.items).toHaveLength(20)
        expect(first.items[0]!.code).toBe(code("bulk24"))

        const second = await list(`period=custom&from=2020-03-10&to=2020-03-10&category=${catBId}&page=2`)
        expect(second.page).toBe(2)
        expect(second.items).toHaveLength(5)
        expect(second.items[4]!.code).toBe(code("bulk0"))

        const beyond = await list(`period=custom&from=2020-03-10&to=2020-03-10&category=${catBId}&page=9`)
        expect(beyond.page).toBe(2)
        expect(beyond.items).toHaveLength(5)
    })

    it("conta os últimos N dias incluindo hoje", async () => {
        const sevenData = await list(`period=7&category=${catRelId}&limit=100`)
        expect(sevenData.range).toEqual({ from: addDaysToDateString(today, -6), to: today })
        const seven = codesOf(sevenData.items)
        expect(seven).toContain(code("rel0"))
        expect(seven).toContain(code("rel6"))
        expect(seven).not.toContain(code("rel7"))

        const thirty = codesOf((await list(`period=30&category=${catRelId}&limit=100`)).items)
        expect(thirty).toContain(code("rel29"))
        expect(thirty).not.toContain(code("rel30"))

        const ninety = codesOf((await list(`period=90&category=${catRelId}&limit=100`)).items)
        expect(ninety).toContain(code("rel89"))
        expect(ninety).not.toContain(code("rel90"))
    })

    it("limita mês atual e mês anterior pelos dias de Brasília", async () => {
        const current = codesOf((await list(`period=current_month&category=${catRelId}&limit=100`)).items)
        expect(current).toContain(code("relMonthStart"))
        expect(current).toContain(code("rel0"))
        expect(current).not.toContain(code("relPrevLast"))

        const previous = codesOf((await list(`period=previous_month&category=${catRelId}&limit=100`)).items)
        expect(previous).toContain(code("relPrevLast"))
        expect(previous).toContain(code("relPrevFirst"))
        expect(previous).not.toContain(code("relMonthStart"))
        expect(previous).not.toContain(code("rel0"))
    })

    it("limita o período personalizado a hoje e inverte datas trocadas", async () => {
        const future = addDaysToDateString(today, 30)
        const capped = codesOf(
            (await list(`period=custom&from=${addDaysToDateString(today, -1)}&to=${future}&category=${catRelId}&limit=100`)).items,
        )
        expect(capped).toContain(code("rel0"))

        const swapped = codesOf(
            (
                await list(
                    `period=custom&from=${today}&to=${addDaysToDateString(today, -6)}&category=${catRelId}&limit=100`,
                )
            ).items,
        )
        expect(swapped).toContain(code("rel6"))
        expect(swapped).toContain(code("rel0"))
        expect(swapped).not.toContain(code("rel7"))
    })

    it("detalha a conversa com a linha do tempo em ordem e com as outras conversas do mesmo número", async () => {
        const res = await request(app)
            .get(`/api/v1/sessions/${code("s2")}`)
            .set("Origin", ORIGIN)
            .set("Cookie", viewer.cookie)
        expect(res.status).toBe(200)
        const detail = res.body.data
        expect(detail.code).toBe(code("s2"))
        expect(detail.outcome).toBe("SCHEDULED")
        expect(detail.anonymized).toBe(false)
        expect(detail.category_name).toBe("Sessões Cat A Teste")
        expect(detail.question_title).toBe("Pergunta A1 Sessões")
        expect(detail.timeline.map((event: { type: string }) => event.type)).toEqual([
            "CATEGORY_CHOSEN",
            "QUESTION_CHOSEN",
            "APPOINTMENT_CREATED",
        ])
        const created = detail.timeline[2]
        expect(created.appointment).toEqual({ id: appointmentId, protocol })
        expect(detail.appointment).toEqual({ id: appointmentId, protocol, action: "CREATED" })
        expect(detail.other_sessions.map((item: { code: string }) => item.code)).toEqual([code("sRet")])
    })

    it("detalha a conversa de retorno com a remarcação e a categoria do agendamento", async () => {
        const res = await request(app)
            .get(`/api/v1/sessions/${code("sRet")}`)
            .set("Origin", ORIGIN)
            .set("Cookie", viewer.cookie)
        expect(res.status).toBe(200)
        const detail = res.body.data
        expect(detail.category_name).toBe("Sessões Cat A Teste")
        expect(detail.appointment.action).toBe("RESCHEDULED")
        const types = detail.timeline.map((event: { type: string }) => event.type)
        expect(types).toEqual(["APPOINTMENT_CONSULTED", "APPOINTMENT_RESCHEDULED"])
        expect(detail.timeline[1].data).toMatchObject({ from: "2021-06-01T13:00:00.000Z", to: "2021-06-02T13:00:00.000Z" })
        expect(detail.other_sessions.map((item: { code: string }) => item.code)).toEqual([code("s2")])
    })

    it("não lista outras conversas para uma sessão anonimizada nem a inclui nas de ninguém", async () => {
        const res = await request(app)
            .get(`/api/v1/sessions/${code("sAnon")}`)
            .set("Origin", ORIGIN)
            .set("Cookie", viewer.cookie)
        expect(res.status).toBe(200)
        expect(res.body.data.anonymized).toBe(true)
        expect(res.body.data.other_sessions).toEqual([])
    })

    it("responde 404 para um código de sessão que não existe", async () => {
        const res = await request(app)
            .get("/api/v1/sessions/S-NAO-EXISTE")
            .set("Origin", ORIGIN)
            .set("Cookie", viewer.cookie)
        expect(res.status).toBe(404)
    })

    it("nunca expõe telefone, hash do telefone nem texto do cidadão na lista ou no detalhe", async () => {
        const listRes = await request(app)
            .get(`/api/v1/sessions?period=custom&from=2021-05-10&to=2021-05-14&category=${catAId}&limit=100`)
            .set("Origin", ORIGIN)
            .set("Cookie", viewer.cookie)
        const detailRes = await request(app)
            .get(`/api/v1/sessions/${code("s2")}`)
            .set("Origin", ORIGIN)
            .set("Cookie", viewer.cookie)
        const body = JSON.stringify([listRes.body, detailRes.body])

        for (const phone of phones.values()) {
            expect(body).not.toContain(phone)
            expect(body).not.toContain(phoneHash(phone))
        }
        expect(body).not.toMatch(/phone|telefone|cpf|"text"|"message"/i)
        expect(body).not.toContain("Cidadão Sessões Teste")
    })
})
