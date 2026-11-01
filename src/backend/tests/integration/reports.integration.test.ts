import request from "supertest"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import app from "../../app"
import getPool from "../../db/connection"
import { insertConversationEvent } from "../../repositories/conversationEvent.repository"
import { reportRepository } from "../../repositories/report.repository"
import type { AbandonedStep } from "../../types/conversationEvent.types"
import type { SessionOutcome } from "../../types/report.types"
import { createReportService } from "../../services/report.service"
import { parseLocalDate } from "../../utils/date.utils"
import { hashPhone as phoneHash } from "./helpers/phone"
import { createTestUser, deleteTestUsers, TestUser } from "./helpers/usersDb"

const ORIGIN = process.env.FRONTEND_ORIGIN as string

const REPORT_START_DATE = "2021-05-10"
const REPORT_END_DATE = "2021-05-14"
const EVALUATION_NOW = parseLocalDate("2021-05-14", "12:00")

const TEST_CAT_1_TITLE = "Relatórios Cat A Teste"
const TEST_CAT_2_TITLE = "Relatórios Cat B Teste"

function makeCpfHash(seed: number): string {
    return String(seed).padStart(64, "a")
}

describe("Reports integration tests (Postgres)", () => {
    const createdUserIds: (number | null)[] = []
    const createdSessionIds: string[] = []
    const createdAppointmentIds: string[] = []
    const createdQuestionIds: number[] = []
    const createdCategoryIds: number[] = []

    let reportViewer: TestUser
    let regularViewer: TestUser
    let staffAssignee: TestUser

    let catAId: number
    let catBId: number
    let qA1Id: number
    let qA2Id: number
    let qB1Id: number

    const service = createReportService(reportRepository)

    async function user(
        input: Parameters<typeof createTestUser>[0],
    ): Promise<TestUser> {
        const created = await createTestUser(input)
        createdUserIds.push(created.createdId)
        return created
    }

    async function insertTestSession(params: {
        phoneIndex: number
        startedAt: Date
        outcome: SessionOutcome
        abandonedStep?: AbandonedStep
    }): Promise<string> {
        const pool = getPool()
        const status =
            params.outcome === "IN_PROGRESS"
                ? "IN_PROGRESS"
                : params.outcome === "ABANDONED"
                  ? "ABANDONED"
                  : "FINISHED"
        const currentStep =
            status === "IN_PROGRESS" ? "AWAITING_CATEGORY" : "FINISHED"
        const endedAt =
            status === "IN_PROGRESS"
                ? null
                : new Date(params.startedAt.getTime() + 10 * 60_000)

        const res = await pool.query<{ id: string }>(
            `INSERT INTO Sessions (
                 phone_hash,
                 status,
                 outcome,
                 current_step,
                 abandoned_at_step,
                 started_at,
                 last_interaction_at,
                 ended_at
             )
             VALUES ($1, $2, $3, $4, $5, $6, $6, $7)
             RETURNING id`,
            [
                phoneHash(`5512977770${String(params.phoneIndex).padStart(3, "0")}`),
                status,
                params.outcome,
                currentStep,
                params.abandonedStep ?? null,
                params.startedAt,
                endedAt,
            ],
        )
        const id = String(res.rows[0]!.id)
        createdSessionIds.push(id)
        return id
    }

    async function insertTestAppointment(params: {
        sessionId: string
        questionId: number
        cpfSeed: number
        appointmentDatetime: Date
        requestDatetime: Date
        status: "PENDING" | "CONFIRMED" | "ATTENDED" | "NO_SHOW" | "CANCELED"
        assignedUserId?: number | null
    }): Promise<string> {
        const pool = getPool()
        const res = await pool.query<{ id: string }>(
            `INSERT INTO Appointments (
                 session_id,
                 question_id,
                 reason,
                 name,
                 cpf_hash,
                 cpf_masked,
                 by_representative,
                 documents_sent,
                 appointment_datetime,
                 status,
                 assigned_user_id,
                 request_datetime
             )
             VALUES ($1, $2, 'REQUIRES_IN_PERSON', 'Cidadão Relatório Teste', $3, '***.123.456-**', false, '{"group":[],"question":[]}'::jsonb, $4, $5, $6, $7)
             RETURNING id`,
            [
                params.sessionId,
                params.questionId,
                makeCpfHash(params.cpfSeed),
                params.appointmentDatetime,
                params.status,
                params.assignedUserId ?? null,
                params.requestDatetime,
            ],
        )
        const id = String(res.rows[0]!.id)
        createdAppointmentIds.push(id)
        return id
    }

    async function cleanup(): Promise<void> {
        const pool = getPool()
        if (createdAppointmentIds.length > 0) {
            await pool.query(
                "DELETE FROM AppointmentEvents WHERE appointment_id = ANY($1::bigint[])",
                [createdAppointmentIds],
            )
            await pool.query(
                "DELETE FROM AppointmentNotes WHERE appointment_id = ANY($1::bigint[])",
                [createdAppointmentIds],
            )
            await pool.query(
                "DELETE FROM ConversationEvents WHERE appointment_id = ANY($1::bigint[])",
                [createdAppointmentIds],
            )
            await pool.query(
                "DELETE FROM Appointments WHERE id = ANY($1::bigint[])",
                [createdAppointmentIds],
            )
        }
        if (createdSessionIds.length > 0) {
            await pool.query(
                "DELETE FROM Sessions WHERE id = ANY($1::bigint[])",
                [createdSessionIds],
            )
        }
        if (createdQuestionIds.length > 0) {
            await pool.query(
                "DELETE FROM Questions WHERE id = ANY($1::bigint[])",
                [createdQuestionIds],
            )
        }
        if (createdCategoryIds.length > 0) {
            await pool.query(
                "DELETE FROM Categories WHERE id = ANY($1::bigint[])",
                [createdCategoryIds],
            )
        }
    }

    beforeAll(async () => {
        const pool = getPool()

        reportViewer = await user({ permissions: ["reports.view"] })
        regularViewer = await user({ permissions: ["appointments.view"] })
        staffAssignee = await user({ permissions: ["appointments.manage"] })

        const catARes = await pool.query<{ id: number }>(
            "INSERT INTO Categories (title, short_title, position) VALUES ($1, 'CatA', 1) RETURNING id",
            [TEST_CAT_1_TITLE],
        )
        catAId = Number(catARes.rows[0]!.id)
        createdCategoryIds.push(catAId)

        const catBRes = await pool.query<{ id: number }>(
            "INSERT INTO Categories (title, short_title, position) VALUES ($1, 'CatB', 2) RETURNING id",
            [TEST_CAT_2_TITLE],
        )
        catBId = Number(catBRes.rows[0]!.id)
        createdCategoryIds.push(catBId)

        const qA1Res = await pool.query<{ id: number }>(
            `INSERT INTO Questions (category_id, question, answer, short_title, position, out_of_scope, requires_in_person, llm_allowed)
             VALUES ($1, 'Pergunta A1 Relatório', 'Resposta A1', 'Curto A1', 1, false, false, false)
             RETURNING id`,
            [catAId],
        )
        qA1Id = Number(qA1Res.rows[0]!.id)
        createdQuestionIds.push(qA1Id)

        const qA2Res = await pool.query<{ id: number }>(
            `INSERT INTO Questions (category_id, question, answer, short_title, position, out_of_scope, requires_in_person, llm_allowed)
             VALUES ($1, 'Pergunta A2 Relatório', 'Resposta A2', 'Curto A2', 2, false, false, false)
             RETURNING id`,
            [catAId],
        )
        qA2Id = Number(qA2Res.rows[0]!.id)
        createdQuestionIds.push(qA2Id)

        const qB1Res = await pool.query<{ id: number }>(
            `INSERT INTO Questions (category_id, question, answer, short_title, position, out_of_scope, requires_in_person, llm_allowed)
             VALUES ($1, 'Pergunta B1 Relatório', 'Resposta B1', 'Curto B1', 1, false, true, false)
             RETURNING id`,
            [catBId],
        )
        qB1Id = Number(qB1Res.rows[0]!.id)
        createdQuestionIds.push(qB1Id)

        const s1 = await insertTestSession({
            phoneIndex: 1,
            startedAt: parseLocalDate("2021-05-10", "09:00"),
            outcome: "RESOLVED",
        })
        await insertConversationEvent(pool, s1, {
            type: "CATEGORY_CHOSEN",
            categoryId: catAId,
        })
        await insertConversationEvent(pool, s1, {
            type: "CATEGORY_CHOSEN",
            categoryId: catAId,
        })
        await insertConversationEvent(pool, s1, {
            type: "QUESTION_CHOSEN",
            categoryId: catAId,
            questionId: qA1Id,
        })
        await insertConversationEvent(pool, s1, {
            type: "QUESTION_CHOSEN",
            categoryId: catAId,
            questionId: qA1Id,
        })

        const s2 = await insertTestSession({
            phoneIndex: 2,
            startedAt: parseLocalDate("2021-05-10", "14:00"),
            outcome: "SCHEDULED",
        })
        await insertConversationEvent(pool, s2, {
            type: "CATEGORY_CHOSEN",
            categoryId: catAId,
        })
        await insertConversationEvent(pool, s2, {
            type: "QUESTION_CHOSEN",
            categoryId: catAId,
            questionId: qA1Id,
        })

        const s3 = await insertTestSession({
            phoneIndex: 3,
            startedAt: parseLocalDate("2021-05-11", "10:00"),
            outcome: "SCHEDULED",
        })
        await insertConversationEvent(pool, s3, {
            type: "CATEGORY_CHOSEN",
            categoryId: catBId,
        })
        await insertConversationEvent(pool, s3, {
            type: "QUESTION_CHOSEN",
            categoryId: catBId,
            questionId: qB1Id,
        })

        const s4 = await insertTestSession({
            phoneIndex: 4,
            startedAt: parseLocalDate("2021-05-12", "11:00"),
            outcome: "ABANDONED",
            abandonedStep: "AWAITING_CATEGORY",
        })
        void s4

        const s5 = await insertTestSession({
            phoneIndex: 5,
            startedAt: parseLocalDate("2021-05-12", "11:30"),
            outcome: "ABANDONED",
            abandonedStep: "AWAITING_HOLDER_CPF",
        })
        await insertConversationEvent(pool, s5, {
            type: "CATEGORY_CHOSEN",
            categoryId: catAId,
        })
        await insertConversationEvent(pool, s5, {
            type: "QUESTION_CHOSEN",
            categoryId: catAId,
            questionId: qA2Id,
        })

        const sOutOfPeriod = await insertTestSession({
            phoneIndex: 6,
            startedAt: parseLocalDate("2021-05-01", "10:00"),
            outcome: "SCHEDULED",
        })

        await insertTestAppointment({
            sessionId: sOutOfPeriod,
            questionId: qB1Id,
            cpfSeed: 1,
            appointmentDatetime: parseLocalDate("2021-05-10", "09:00"),
            requestDatetime: parseLocalDate("2021-05-01", "10:05"),
            status: "ATTENDED",
            assignedUserId: staffAssignee.id,
        })
        await insertTestAppointment({
            sessionId: sOutOfPeriod,
            questionId: qB1Id,
            cpfSeed: 2,
            appointmentDatetime: parseLocalDate("2021-05-10", "10:00"),
            requestDatetime: parseLocalDate("2021-05-01", "10:10"),
            status: "ATTENDED",
            assignedUserId: staffAssignee.id,
        })
        await insertTestAppointment({
            sessionId: sOutOfPeriod,
            questionId: qB1Id,
            cpfSeed: 3,
            appointmentDatetime: parseLocalDate("2021-05-10", "11:00"),
            requestDatetime: parseLocalDate("2021-05-01", "10:15"),
            status: "ATTENDED",
            assignedUserId: staffAssignee.id,
        })
        await insertTestAppointment({
            sessionId: s2,
            questionId: qB1Id,
            cpfSeed: 4,
            appointmentDatetime: parseLocalDate("2021-05-11", "09:00"),
            requestDatetime: parseLocalDate("2021-05-10", "14:05"),
            status: "NO_SHOW",
            assignedUserId: staffAssignee.id,
        })
        await insertTestAppointment({
            sessionId: s2,
            questionId: qB1Id,
            cpfSeed: 5,
            appointmentDatetime: parseLocalDate("2021-05-11", "10:00"),
            requestDatetime: parseLocalDate("2021-05-10", "14:10"),
            status: "CANCELED",
            assignedUserId: null,
        })
        await insertTestAppointment({
            sessionId: s3,
            questionId: qB1Id,
            cpfSeed: 6,
            appointmentDatetime: parseLocalDate("2021-05-11", "15:00"),
            requestDatetime: parseLocalDate("2021-05-11", "10:05"),
            status: "CONFIRMED",
            assignedUserId: staffAssignee.id,
        })
        await insertTestAppointment({
            sessionId: s3,
            questionId: qB1Id,
            cpfSeed: 7,
            appointmentDatetime: parseLocalDate("2021-05-14", "14:00"),
            requestDatetime: parseLocalDate("2021-05-11", "10:10"),
            status: "CONFIRMED",
            assignedUserId: staffAssignee.id,
        })
        await insertTestAppointment({
            sessionId: s3,
            questionId: qB1Id,
            cpfSeed: 8,
            appointmentDatetime: parseLocalDate("2021-05-14", "16:00"),
            requestDatetime: parseLocalDate("2021-05-11", "10:15"),
            status: "PENDING",
            assignedUserId: null,
        })
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

    it("restringe GET /api/v1/reports a contas autenticadas com permissão reports.view", async () => {
        const unauth = await request(app)
            .get("/api/v1/reports")
            .set("Origin", ORIGIN)
        expect(unauth.status).toBe(401)

        const forbidden = await request(app)
            .get("/api/v1/reports")
            .set("Origin", ORIGIN)
            .set("Cookie", regularViewer.cookie)
        expect(forbidden.status).toBe(403)

        const allowed = await request(app)
            .get(
                `/api/v1/reports?period=custom&startDate=${REPORT_START_DATE}&endDate=${REPORT_END_DATE}`,
            )
            .set("Origin", ORIGIN)
            .set("Cookie", reportViewer.cookie)
        expect(allowed.status).toBe(200)
        expect(allowed.headers["cache-control"]).toBe("no-store")
    })

    it("calcula total de conversas, média diária, agendamentos criados e série diária no período", async () => {
        const summary = await service.getSummary(
            {
                period: "custom",
                startDate: REPORT_START_DATE,
                endDate: REPORT_END_DATE,
            },
            EVALUATION_NOW,
        )

        expect(summary.period).toEqual({
            preset: "custom",
            startDate: REPORT_START_DATE,
            endDate: REPORT_END_DATE,
            daysCount: 5,
            today: "2021-05-14",
        })
        expect(summary.conversations).toEqual({
            total: 5,
            dailyAverage: 1,
            appointmentsCreated: 2,
        })
        expect(summary.dailySeries).toEqual([
            {
                date: "2021-05-10",
                conversations: 2,
                appointmentsCreated: 1,
            },
            {
                date: "2021-05-11",
                conversations: 1,
                appointmentsCreated: 1,
            },
            {
                date: "2021-05-12",
                conversations: 2,
                appointmentsCreated: 0,
            },
            {
                date: "2021-05-13",
                conversations: 0,
                appointmentsCreated: 0,
            },
            {
                date: "2021-05-14",
                conversations: 0,
                appointmentsCreated: 0,
            },
        ])
    })

    it("consolida os desfechos das conversas iniciadas no período somando 100%", async () => {
        const summary = await service.getSummary(
            {
                period: "custom",
                startDate: REPORT_START_DATE,
                endDate: REPORT_END_DATE,
            },
            EVALUATION_NOW,
        )

        const resolved = summary.outcomes.find((o) => o.outcome === "RESOLVED")
        const scheduled = summary.outcomes.find(
            (o) => o.outcome === "SCHEDULED",
        )
        const abandoned = summary.outcomes.find(
            (o) => o.outcome === "ABANDONED",
        )
        const inProgress = summary.outcomes.find(
            (o) => o.outcome === "IN_PROGRESS",
        )

        expect(resolved).toMatchObject({ count: 1, percentage: 20 })
        expect(scheduled).toMatchObject({ count: 2, percentage: 40 })
        expect(abandoned).toMatchObject({ count: 2, percentage: 40 })
        expect(inProgress).toBeUndefined()

        const totalPct = summary.outcomes.reduce(
            (sum, item) => sum + item.percentage,
            0,
        )
        expect(totalPct).toBe(100)
    })

    it("conta conversas distintas em topCategories e topQuestions sem duplicar repetições na mesma sessão", async () => {
        const summary = await service.getSummary(
            {
                period: "custom",
                startDate: REPORT_START_DATE,
                endDate: REPORT_END_DATE,
            },
            EVALUATION_NOW,
        )

        expect(summary.topCategories).toEqual([
            {
                categoryId: String(catAId),
                title: TEST_CAT_1_TITLE,
                conversationsCount: 3,
            },
            {
                categoryId: String(catBId),
                title: TEST_CAT_2_TITLE,
                conversationsCount: 1,
            },
        ])

        expect(summary.topQuestions).toEqual([
            {
                questionId: String(qA1Id),
                question: "Pergunta A1 Relatório",
                shortTitle: "Curto A1",
                categoryId: String(catAId),
                categoryTitle: TEST_CAT_1_TITLE,
                conversationsCount: 2,
            },
            {
                questionId: String(qA2Id),
                question: "Pergunta A2 Relatório",
                shortTitle: "Curto A2",
                categoryId: String(catAId),
                categoryTitle: TEST_CAT_1_TITLE,
                conversationsCount: 1,
            },
            {
                questionId: String(qB1Id),
                question: "Pergunta B1 Relatório",
                shortTitle: "Curto B1",
                categoryId: String(catBId),
                categoryTitle: TEST_CAT_2_TITLE,
                conversationsCount: 1,
            },
        ])
    })

    it("calcula appointmentsResult e noShowRate pela data do atendimento no período sem expor dados pessoais", async () => {
        const summary = await service.getSummary(
            {
                period: "custom",
                startDate: REPORT_START_DATE,
                endDate: REPORT_END_DATE,
            },
            EVALUATION_NOW,
        )

        expect(summary.appointmentsResult).toEqual({
            attended: 3,
            noShow: 1,
            canceled: 1,
            waitingRecord: 1,
            upcoming: 2,
            total: 8,
            recordedTotal: 4,
            noShowRate: 25,
        })

        const serialized = JSON.stringify(summary)
        expect(serialized).not.toContain("Cidadão Relatório Teste")
        expect(serialized).not.toContain("***.123.456-**")
        expect(serialized).not.toContain(makeCpfHash(1))
    })

    it("mapeia e soma as etapas das conversas abandonadas nas 6 etapas do funil", async () => {
        const summary = await service.getSummary(
            {
                period: "custom",
                startDate: REPORT_START_DATE,
                endDate: REPORT_END_DATE,
            },
            EVALUATION_NOW,
        )

        const categoriesStage = summary.abandonmentFunnel.find(
            (item) => item.stage === "CATEGORIES",
        )
        const attendeeStage = summary.abandonmentFunnel.find(
            (item) => item.stage === "ATTENDEE",
        )

        expect(categoriesStage).toEqual({
            stage: "CATEGORIES",
            label: "Na lista de categorias",
            count: 1,
            percentageOfTotal: 20,
            percentageOfAbandoned: 50,
        })
        expect(attendeeStage).toEqual({
            stage: "ATTENDEE",
            label: "Em quem vai comparecer",
            count: 1,
            percentageOfTotal: 20,
            percentageOfAbandoned: 50,
        })
    })
})
