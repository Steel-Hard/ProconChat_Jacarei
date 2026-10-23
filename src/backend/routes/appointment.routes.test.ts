import express from "express"
import request from "supertest"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import errorHandler from "../middleware/errorHandler.middleware"
import { createRequireAuth } from "../middleware/auth.middleware"
import {
    buildAppointmentDetail,
    buildChipCounts,
    buildListItem,
    conversationEventsOf,
    conversationTimelineEvents,
    FIXED_DATES,
    FIXED_NOW,
} from "../repositories/mock/appointment.builders"
import { AppointmentRepositoryStub } from "../repositories/mock/appointmentStub.repository"
import { MockAuthRepository } from "../repositories/mock/authMock.repository"
import type { ConversationEventService } from "../services/conversationEvent.service"
import type { AppointmentDetailRecord } from "../types/appointment.types"
import { sessionTokens } from "../utils/sessionToken"
import ConflictError from "../errors/ConflictError"
import type { AppointmentActionCall } from "../repositories/mock/appointmentStub.repository"
import { AppointmentRoutes } from "./appointment.routes"

const authUsers = new MockAuthRepository([
    {
        id: 1,
        email: "admin@exemplo.test",
        passwordHash: "x",
        name: "Admin",
        isAdmin: true,
        permissions: [],
        sessionVersion: 1,
    },
    {
        id: 5,
        email: "viewer@exemplo.test",
        passwordHash: "x",
        name: "Viewer",
        isAdmin: false,
        permissions: ["appointments.view"],
        sessionVersion: 1,
    },
    {
        id: 6,
        email: "semacesso@exemplo.test",
        passwordHash: "x",
        name: "Sem Acesso",
        isAdmin: false,
        permissions: [],
        sessionVersion: 1,
    },
    {
        id: 10,
        email: "operator@exemplo.test",
        passwordHash: "x",
        name: "Operator",
        isAdmin: false,
        permissions: ["appointments.manage", "appointments.view"],
        sessionVersion: 1,
    },
])

function accessCookieFor(userId: number, sessionVersion = 1): string {
    return `proconchat_access=${sessionTokens.signAccessToken({ userId, sessionVersion })}`
}

const STATUS_AFTER_ACTION = { claim: "CONFIRMED", attended: "ATTENDED", no_show: "NO_SHOW", assign: "CONFIRMED" } as const
const EVENT_OF_ACTION = { claim: "CLAIMED", attended: "ATTENDED", no_show: "NO_SHOW", assign: "ASSIGNED" } as const
const PERMISSION_REQUIRED = { allowed: false, code: "PERMISSION_REQUIRED" }

function simpleAction(action: string): keyof typeof STATUS_AFTER_ACTION {
    if (action === "claim" || action === "attended" || action === "no_show" || action === "assign") {
        return action
    }
    throw new Error(`Cenário incompleto: ação ${action} sem afterAction`)
}
const LIST_CHIPS = buildChipCounts({ all: 6, pending: 3, confirmed: 2, canceled: 1 })
const STAFF = [
    { id: "2", name: "Carlos Atendente", active: true },
    { id: "11", name: "Ivone Antiga", active: false },
]

function responsibleAfter(call: AppointmentActionCall, current: AppointmentDetailRecord): string {
    if (call.assigneeUserId !== undefined) {
        return String(call.assigneeUserId)
    }
    return current.assigned_user_id ?? String(call.actorUserId)
}

function routesScenario(
    overrides: Record<string, Partial<AppointmentDetailRecord>> = {},
    failAction?: (call: AppointmentActionCall) => Error | null,
): AppointmentRepositoryStub {
    const carlos = { assigned_user_id: "2", assigned_user_name: "Carlos Atendente" }
    const details = [
        buildAppointmentDetail(),
        buildAppointmentDetail({ id: "2", status: "CONFIRMED", appointment_datetime: FIXED_DATES.afterTomorrow, ...carlos }),
        buildAppointmentDetail({ id: "3", status: "CONFIRMED", appointment_datetime: FIXED_DATES.yesterday, ...carlos }),
        buildAppointmentDetail({ id: "4", status: "ATTENDED", appointment_datetime: FIXED_DATES.threeDaysAgo, ...carlos }),
        buildAppointmentDetail({ id: "5", status: "NO_SHOW", appointment_datetime: FIXED_DATES.fourDaysAgo, ...carlos }),
        buildAppointmentDetail({ id: "6", status: "CANCELED", appointment_datetime: FIXED_DATES.inThreeDays }),
        buildAppointmentDetail({ id: "7", status: "PENDING", appointment_datetime: FIXED_DATES.todayEarly }),
        buildAppointmentDetail({ id: "8", status: "PENDING", appointment_datetime: FIXED_DATES.todayLate }),
    ].map((detail) => ({ ...detail, ...overrides[detail.id] }))

    return new AppointmentRepositoryStub({
        details,
        list: {
            items: [buildListItem(), buildListItem({ id: "7", appointment_datetime: FIXED_DATES.todayEarly })],
            total: 6,
            chipCounts: LIST_CHIPS,
        },
        pendingCount: 3,
        staff: STAFF,
        titles: {
            categories: { 10: "Cobrança" },
            questions: { 1: "Cobrança indevida de serviço não contratado" },
        },
        afterAction: (call, current) => ({
            ...current,
            status: STATUS_AFTER_ACTION[simpleAction(call.action)],
            assigned_user_id: responsibleAfter(call, current),
            events: [
                {
                    id: String(current.events.length + 1),
                    type: EVENT_OF_ACTION[simpleAction(call.action)],
                    actor_user_id: String(call.actorUserId),
                    actor_user_name: null,
                    data: call.assigneeUserId !== undefined ? { assignee_user_id: call.assigneeUserId } : {},
                    created_at: (call.now ?? FIXED_NOW).toISOString(),
                },
                ...current.events,
            ],
        }),
        failAction,
    })
}

describe("appointment.routes (HTTP)", () => {
    let app: express.Express
    let repository: AppointmentRepositoryStub
    const timelineEvents = conversationEventsOf(conversationTimelineEvents("101"))
    const mockConversationEvents: ConversationEventService = {
        record: vi.fn(),
        finish: vi.fn(),
        listBySession: vi.fn().mockResolvedValue([]),
    }

    function buildApp(conversationEvents: ConversationEventService): express.Express {
        const authMiddleware = createRequireAuth({ users: authUsers, tokens: sessionTokens })
        const built = express()
        built.use(express.json())
        built.use(
            "/api/v1/appointments",
            new AppointmentRoutes({ repository, conversationEvents, authMiddleware }).getRouter(),
        )
        built.use(errorHandler)
        return built
    }

    beforeEach(() => {
        vi.useFakeTimers({ toFake: ["Date"] })
        vi.setSystemTime(FIXED_NOW)
        repository = routesScenario()
        app = buildApp(mockConversationEvents)
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    describe("Autenticação e Permissões", () => {
        it("retorna 401 em todas as rotas se não estiver autenticado", async () => {
            const getRes = await request(app).get("/api/v1/appointments")
            expect(getRes.status).toBe(401)

            const countRes = await request(app).get("/api/v1/appointments/pending-count")
            expect(countRes.status).toBe(401)

            const patchRes = await request(app)
                .patch("/api/v1/appointments/1/status")
                .send({ action: "claim" })
            expect(patchRes.status).toBe(401)
        })

        it("retorna 403 em ações de gerenciar para usuário que só tem permissão de visualização", async () => {
            const patchRes = await request(app)
                .patch("/api/v1/appointments/1/status")
                .set("Cookie", accessCookieFor(5))
                .send({ action: "claim" })

            expect(patchRes.status).toBe(403)
            expect(patchRes.body.error.message).toBe("Insufficient permission")
        })

        it("permite GET para usuário com appointments.view", async () => {
            const res = await request(app)
                .get("/api/v1/appointments")
                .set("Cookie", accessCookieFor(5))

            expect(res.status).toBe(200)
            expect(res.body.data.items).toBeInstanceOf(Array)
        })

        it("permite todas as ações para usuário Admin", async () => {
            const res = await request(app)
                .get("/api/v1/appointments")
                .set("Cookie", accessCookieFor(1))

            expect(res.status).toBe(200)

            const patchRes = await request(app)
                .patch("/api/v1/appointments/1/status")
                .set("Cookie", accessCookieFor(1))
                .send({ action: "claim" })

            expect(patchRes.status).toBe(200)
            expect(patchRes.body.data.status).toBe("CONFIRMED")
        })
    })

    describe("GET /api/v1/appointments/staff", () => {
        it("retorna 401 sem sessão", async () => {
            const res = await request(app).get("/api/v1/appointments/staff")

            expect(res.status).toBe(401)
        })

        it("retorna 403 FORBIDDEN para a conta sem appointments.view", async () => {
            const res = await request(app)
                .get("/api/v1/appointments/staff")
                .set("Cookie", accessCookieFor(6))

            expect(res.status).toBe(403)
            expect(res.body.error.code).toBe("FORBIDDEN")
        })

        it("devolve a lista de funcionários para quem tem appointments.view, sem cair no validador de id", async () => {
            const res = await request(app)
                .get("/api/v1/appointments/staff")
                .set("Cookie", accessCookieFor(5))

            expect(res.status).toBe(200)
            expect(res.body).toEqual({ data: STAFF })
        })
    })

    describe("GET /api/v1/appointments/pending-count", () => {
        it("retorna o contador de pendentes", async () => {
            const res = await request(app)
                .get("/api/v1/appointments/pending-count")
                .set("Cookie", accessCookieFor(1))

            expect(res.status).toBe(200)
            expect(res.body.data).toHaveProperty("count")
            expect(typeof res.body.data.count).toBe("number")
        })
    })

    describe("GET /api/v1/appointments", () => {
        it("retorna listagem com paginação e chipCounts (padrão período próximos)", async () => {
            const res = await request(app)
                .get("/api/v1/appointments?page=1&limit=20")
                .set("Cookie", accessCookieFor(1))

            expect(res.status).toBe(200)
            expect(res.body.data.items).toBeInstanceOf(Array)
            expect(res.body.data.total).toBe(6)
            expect(res.body.data.chipCounts).toEqual(LIST_CHIPS)
            expect(repository.findListCalls[0]?.filters).toMatchObject({ period: "upcoming", page: 1, limit: 20 })
        })

        it("retorna todos os agendamentos quando period=all", async () => {
            const res = await request(app)
                .get("/api/v1/appointments?period=all")
                .set("Cookie", accessCookieFor(1))

            expect(res.status).toBe(200)
            expect(repository.findListCalls[0]?.filters.period).toBe("all")
        })

        it("filtra por status PENDING", async () => {
            const res = await request(app)
                .get("/api/v1/appointments?status=PENDING")
                .set("Cookie", accessCookieFor(1))

            expect(res.status).toBe(200)
            expect(repository.findListCalls[0]?.filters.status).toBe("PENDING")
        })

        it("retorna 400 se enviar query param inválido pelo schema Zod", async () => {
            const res = await request(app)
                .get("/api/v1/appointments?status=STATUS_INEXISTENTE")
                .set("Cookie", accessCookieFor(1))

            expect(res.status).toBe(400)
            expect(res.body.error.code).toBe("BAD_REQUEST")
        })

        it("retorna 400 se search tiver menos de 2 caracteres", async () => {
            const res = await request(app)
                .get("/api/v1/appointments?search=a")
                .set("Cookie", accessCookieFor(1))

            expect(res.status).toBe(400)
            expect(res.body.error.code).toBe("BAD_REQUEST")
        })

        it("retorna 400 se responsible for string não numérica inválida", async () => {
            const res = await request(app)
                .get("/api/v1/appointments?responsible=invalido")
                .set("Cookie", accessCookieFor(1))

            expect(res.status).toBe(400)
            expect(res.body.error.code).toBe("BAD_REQUEST")
        })
    })

    describe("GET /api/v1/appointments/:id", () => {
        it("retorna detalhe completo do agendamento", async () => {
            const res = await request(buildApp(timelineEvents))
                .get("/api/v1/appointments/1")
                .set("Cookie", accessCookieFor(1))

            expect(res.status).toBe(200)
            expect(res.body.data.id).toBe("1")
            expect(res.body.data.name).toBe("Maria Silva")
            expect(res.body.data.documents_sent).toBeDefined()
            expect(res.body.data.events).toBeInstanceOf(Array)
            expect(res.body.data.timeline).toBeInstanceOf(Array)
            expect(res.body.data.events.map((e: { type: string }) => e.type)).toEqual(["CREATED"])
            expect(res.body.data.timeline.map((step: { type: string }) => step.type)).toEqual([
                "STARTED",
                "CATEGORY_CHOSEN",
                "QUESTION_CHOSEN",
                "ANSWER_SENT",
                "RESOLVED_ANSWERED",
                "SCHEDULE_OFFERED",
                "ATTENDEE_CHOSEN",
                "APPOINTMENT_CREATED",
            ])
            expect(res.body.data.timeline[1].data).toEqual({ categoryId: 10, category_title: "Cobrança" })
            expect(res.body.data.timeline[3].generated_by_ai).toBe(true)
        })

        describe("ações disponíveis", () => {
            afterEach(() => {
                vi.useRealTimers()
            })

            it("informa as ações disponíveis de um pendente futuro", async () => {
                const res = await request(app)
                    .get("/api/v1/appointments/1")
                    .set("Cookie", accessCookieFor(1))

                expect(res.body.data.available_actions).toEqual({
                    claim: { allowed: true, code: null },
                    attended: { allowed: false, code: "ATTENDANCE_NOT_YET_AVAILABLE" },
                    no_show: { allowed: false, code: "NO_SHOW_NOT_YET_AVAILABLE" },
                    assign: { allowed: true, code: null },
                    correct_record: { allowed: false, code: "RECORD_NOT_CORRECTABLE" },
                    add_note: { allowed: true, code: null },
                })
            })

            it("informa as ações disponíveis de um confirmado de hoje antes do horário", async () => {
                vi.useFakeTimers({ toFake: ["Date"] })
                vi.setSystemTime(new Date("2026-10-20T10:00:00-03:00"))
                repository = routesScenario({ "2": { appointment_datetime: new Date("2026-10-20T15:00:00-03:00").toISOString() } })
                app = buildApp(mockConversationEvents)

                const res = await request(app)
                    .get("/api/v1/appointments/2")
                    .set("Cookie", accessCookieFor(1))

                expect(res.body.data.available_actions).toEqual({
                    claim: { allowed: false, code: "APPOINTMENT_ALREADY_CLAIMED" },
                    attended: { allowed: true, code: null },
                    no_show: { allowed: false, code: "NO_SHOW_NOT_YET_AVAILABLE" },
                    assign: { allowed: true, code: null },
                    correct_record: { allowed: false, code: "RECORD_NOT_CORRECTABLE" },
                    add_note: { allowed: true, code: null },
                })
            })

            it("informa as ações disponíveis de um confirmado que já passou", async () => {
                const res = await request(app)
                    .get("/api/v1/appointments/3")
                    .set("Cookie", accessCookieFor(1))

                expect(res.body.data.available_actions).toEqual({
                    claim: { allowed: false, code: "APPOINTMENT_ALREADY_CLAIMED" },
                    attended: { allowed: true, code: null },
                    no_show: { allowed: true, code: null },
                    assign: { allowed: true, code: null },
                    correct_record: { allowed: false, code: "RECORD_NOT_CORRECTABLE" },
                    add_note: { allowed: true, code: null },
                })
            })

            it("a conta só com appointments.view recebe PERMISSION_REQUIRED nas seis ações de gerenciar", async () => {
                const res = await request(app)
                    .get("/api/v1/appointments/3")
                    .set("Cookie", accessCookieFor(5))

                expect(res.status).toBe(200)
                expect(res.body.data.available_actions).toEqual({
                    claim: PERMISSION_REQUIRED,
                    attended: PERMISSION_REQUIRED,
                    no_show: PERMISSION_REQUIRED,
                    assign: PERMISSION_REQUIRED,
                    correct_record: PERMISSION_REQUIRED,
                    add_note: PERMISSION_REQUIRED,
                })
            })

            it.each([
                { label: "a conta com appointments.manage", userId: 10 },
                { label: "o Admin", userId: 1 },
            ])("$label recebe as ações pelas regras de status", async ({ userId }) => {
                const res = await request(app)
                    .get("/api/v1/appointments/4")
                    .set("Cookie", accessCookieFor(userId))

                expect(res.body.data.available_actions).toEqual({
                    claim: { allowed: false, code: "ALREADY_ATTENDED" },
                    attended: { allowed: false, code: "ALREADY_ATTENDED" },
                    no_show: { allowed: false, code: "ALREADY_ATTENDED" },
                    assign: { allowed: false, code: "ALREADY_ATTENDED" },
                    correct_record: { allowed: true, code: null },
                    add_note: { allowed: true, code: null },
                })
            })
        })

        it("retorna 404 para ID inexistente", async () => {
            const res = await request(app)
                .get("/api/v1/appointments/9999")
                .set("Cookie", accessCookieFor(1))

            expect(res.status).toBe(404)
        })

        it("retorna 400 para ID não numérico", async () => {
            const res = await request(app)
                .get("/api/v1/appointments/abc")
                .set("Cookie", accessCookieFor(1))

            expect(res.status).toBe(400)
            expect(res.body.error.code).toBe("BAD_REQUEST")
        })

        it("retorna 400 para ID que excede bigint", async () => {
            const res = await request(app)
                .get("/api/v1/appointments/999999999999999999999999999")
                .set("Cookie", accessCookieFor(1))

            expect(res.status).toBe(400)
            expect(res.body.error.code).toBe("BAD_REQUEST")
        })
    })

    describe("Ações de Status (PATCH /status)", () => {
        it("o PATCH devolve o mesmo detalhe que o GET em seguida, com linha do tempo e histórico", async () => {
            const appWithTimeline = buildApp(timelineEvents)

            const patchRes = await request(appWithTimeline)
                .patch("/api/v1/appointments/1/status")
                .set("Cookie", accessCookieFor(10))
                .send({ action: "claim" })
            const getRes = await request(appWithTimeline)
                .get("/api/v1/appointments/1")
                .set("Cookie", accessCookieFor(10))

            expect(patchRes.status).toBe(200)
            expect(patchRes.body.data.timeline.length).toBeGreaterThan(0)
            expect(patchRes.body.data.events[0].type).toBe("CLAIMED")
            expect(patchRes.body.data).toEqual(getRes.body.data)
        })

        it.each([
            { action: "attended", id: 7, status: "ATTENDED", terminalEvent: "ATTENDED" },
            { action: "no_show", id: 3, status: "NO_SHOW", terminalEvent: "NO_SHOW" },
        ])(
            "o PATCH $action devolve o mesmo detalhe que o GET em seguida, com linha do tempo e histórico",
            async ({ action, id, status, terminalEvent }) => {
                const events: ConversationEventService = {
                    record: vi.fn(),
                    finish: vi.fn(),
                    listBySession: vi.fn().mockResolvedValue([
                        { type: "STARTED", createdAt: new Date() },
                        { type: "CATEGORY_CHOSEN", createdAt: new Date() },
                    ]),
                }
                const appWithTimeline = buildApp(events)

                const patchRes = await request(appWithTimeline)
                    .patch(`/api/v1/appointments/${id}/status`)
                    .set("Cookie", accessCookieFor(10))
                    .send({ action })
                const getRes = await request(appWithTimeline)
                    .get(`/api/v1/appointments/${id}`)
                    .set("Cookie", accessCookieFor(10))

                expect(patchRes.status).toBe(200)
                expect(patchRes.body.data.status).toBe(status)
                expect(patchRes.body.data.timeline).toHaveLength(2)
                expect(patchRes.body.data.events[0].type).toBe(terminalEvent)
                expect(patchRes.body.data).toEqual(getRes.body.data)
                expect(repository.actionCalls).toEqual([{ action, id: String(id), actorUserId: 10, now: FIXED_NOW }])
            },
        )

        it("executa ação claim via PATCH /status", async () => {
            const res = await request(app)
                .patch("/api/v1/appointments/1/status")
                .set("Cookie", accessCookieFor(10))
                .send({ action: "claim" })

            expect(res.status).toBe(200)
            expect(res.body.data.status).toBe("CONFIRMED")
            expect(res.body.data.assigned_user_id).toBe("10")
            expect(res.body.data.events[0].type).toBe("CLAIMED")
            expect(res.body.data.events[0].actor_user_id).toBe("10")
            expect(repository.actionCalls).toEqual([{ action: "claim", id: "1", actorUserId: 10, now: FIXED_NOW }])
        })

        it("executa ação attended com sucesso para agendamento de hoje", async () => {
            const res = await request(app)
                .patch("/api/v1/appointments/7/status")
                .set("Cookie", accessCookieFor(10))
                .send({ action: "attended" })

            expect(res.status).toBe(200)
            expect(res.body.data.status).toBe("ATTENDED")
            expect(repository.actionCalls).toEqual([{ action: "attended", id: "7", actorUserId: 10, now: FIXED_NOW }])
        })

        it("retorna 409 com ATTENDANCE_NOT_YET_AVAILABLE ao tentar marcar attended para agendamento futuro", async () => {
            const res = await request(app)
                .patch("/api/v1/appointments/1/status")
                .set("Cookie", accessCookieFor(10))
                .send({ action: "attended" })

            expect(res.status).toBe(409)
            expect(res.body.error.code).toBe("ATTENDANCE_NOT_YET_AVAILABLE")
            expect(res.body.error.message).toBe("Disponível a partir do dia do atendimento")
        })

        it("retorna 409 com NO_SHOW_NOT_YET_AVAILABLE ao tentar marcar no_show para agendamento futuro", async () => {
            const res = await request(app)
                .patch("/api/v1/appointments/8/status")
                .set("Cookie", accessCookieFor(10))
                .send({ action: "no_show" })

            expect(res.status).toBe(409)
            expect(res.body.error.code).toBe("NO_SHOW_NOT_YET_AVAILABLE")
            expect(res.body.error.message).toBe("Disponível apenas após o horário do agendamento")
        })

        it("retorna 400 com body inválido no PATCH /status", async () => {
            const res = await request(app)
                .patch("/api/v1/appointments/1/status")
                .set("Cookie", accessCookieFor(1))
                .send({ action: "invalido" })

            expect(res.status).toBe(400)
        })

        it("retorna 409 com APPOINTMENT_ALREADY_CLAIMED ao tentar assumir agendamento já confirmado", async () => {
            const res = await request(app)
                .patch("/api/v1/appointments/2/status")
                .set("Cookie", accessCookieFor(10))
                .send({ action: "claim" })

            expect(res.status).toBe(409)
            expect(res.body.error.code).toBe("APPOINTMENT_ALREADY_CLAIMED")
        })

        it("retorna 409 com APPOINTMENT_CANCELED ao tentar assumir agendamento cancelado", async () => {
            const res = await request(app)
                .patch("/api/v1/appointments/6/status")
                .set("Cookie", accessCookieFor(10))
                .send({ action: "claim" })

            expect(res.status).toBe(409)
            expect(res.body.error.code).toBe("APPOINTMENT_CANCELED")
        })

        it("retorna 409 com ALREADY_ATTENDED ao tentar assumir agendamento já atendido", async () => {
            const res = await request(app)
                .patch("/api/v1/appointments/4/status")
                .set("Cookie", accessCookieFor(10))
                .send({ action: "claim" })

            expect(res.status).toBe(409)
            expect(res.body.error.code).toBe("ALREADY_ATTENDED")
        })

        it("retorna 409 com ALREADY_ATTENDED ao tentar marcar attended repetido", async () => {
            const res = await request(app)
                .patch("/api/v1/appointments/4/status")
                .set("Cookie", accessCookieFor(10))
                .send({ action: "attended" })

            expect(res.status).toBe(409)
            expect(res.body.error.code).toBe("ALREADY_ATTENDED")
        })

        it("retorna 409 com APPOINTMENT_CANCELED ao tentar marcar attended em cancelado", async () => {
            const res = await request(app)
                .patch("/api/v1/appointments/6/status")
                .set("Cookie", accessCookieFor(10))
                .send({ action: "attended" })

            expect(res.status).toBe(409)
            expect(res.body.error.code).toBe("APPOINTMENT_CANCELED")
        })

        it("retorna 409 com ALREADY_NO_SHOW ao tentar marcar no_show repetido", async () => {
            const res = await request(app)
                .patch("/api/v1/appointments/5/status")
                .set("Cookie", accessCookieFor(10))
                .send({ action: "no_show" })

            expect(res.status).toBe(409)
            expect(res.body.error.code).toBe("ALREADY_NO_SHOW")
        })

        it("retorna 409 com APPOINTMENT_CANCELED ao tentar marcar no_show em cancelado", async () => {
            const res = await request(app)
                .patch("/api/v1/appointments/6/status")
                .set("Cookie", accessCookieFor(10))
                .send({ action: "no_show" })

            expect(res.status).toBe(409)
            expect(res.body.error.code).toBe("APPOINTMENT_CANCELED")
        })
    })

    describe("Atribuir (PATCH /status com assign)", () => {
        function assign(id: number, assigneeUserId: unknown, userId = 10): request.Test {
            return request(app)
                .patch(`/api/v1/appointments/${id}/status`)
                .set("Cookie", accessCookieFor(userId))
                .send({ action: "assign", assigneeUserId })
        }

        it("atribui um pendente a outro funcionário e devolve o detalhe confirmado com o evento ASSIGNED", async () => {
            const res = await assign(1, 2)

            expect(res.status).toBe(200)
            expect(res.body.data.status).toBe("CONFIRMED")
            expect(res.body.data.assigned_user_id).toBe("2")
            expect(res.body.data.events[0]).toMatchObject({
                type: "ASSIGNED",
                actor_user_id: "10",
                data: { assignee_user_id: 2 },
            })
            expect(repository.actionCalls).toEqual([
                { action: "assign", id: "1", actorUserId: 10, assigneeUserId: 2, now: FIXED_NOW },
            ])
        })

        it("atribui um confirmado a outro funcionário aceitando o id em texto", async () => {
            const res = await assign(2, "10")

            expect(res.status).toBe(200)
            expect(res.body.data.status).toBe("CONFIRMED")
            expect(res.body.data.assigned_user_id).toBe("10")
            expect(repository.actionCalls[0]?.assigneeUserId).toBe(10)
        })

        it.each([
            { id: 4, code: "ALREADY_ATTENDED" },
            { id: 5, code: "ALREADY_NO_SHOW" },
            { id: 6, code: "APPOINTMENT_CANCELED" },
        ])("recusa atribuir o agendamento $id com 409 $code", async ({ id, code }) => {
            const res = await assign(id, 2)

            expect(res.status).toBe(409)
            expect(res.body.error.code).toBe(code)
        })

        it("devolve 409 ASSIGNEE_BUSY com os detalhes do agendamento conflitante", async () => {
            const details = { assigneeUserId: "2", conflictingAppointmentId: "33", conflictingProtocol: "B71C0D2E" }
            repository = routesScenario({}, (call) =>
                call.action === "assign"
                    ? new ConflictError("O funcionário já tem outro agendamento neste horário", "ASSIGNEE_BUSY", details)
                    : null,
            )
            app = buildApp(mockConversationEvents)

            const res = await assign(1, 2)

            expect(res.status).toBe(409)
            expect(res.body).toEqual({
                error: {
                    code: "ASSIGNEE_BUSY",
                    message: "O funcionário já tem outro agendamento neste horário",
                    details,
                },
            })
        })

        it("recusa com 403 FORBIDDEN a conta só com appointments.view, sem gravar nada", async () => {
            const res = await assign(1, 2, 5)

            expect(res.status).toBe(403)
            expect(res.body.error.code).toBe("FORBIDDEN")
            expect(repository.actionCalls).toEqual([])
        })

        it.each([
            { label: "sem destino", body: { action: "assign" } },
            { label: "com destino inválido", body: { action: "assign", assigneeUserId: "abc" } },
        ])("retorna 400 para assign $label", async ({ body }) => {
            const res = await request(app)
                .patch("/api/v1/appointments/1/status")
                .set("Cookie", accessCookieFor(10))
                .send(body)

            expect(res.status).toBe(400)
            expect(res.body.error.code).toBe("BAD_REQUEST")
            expect(repository.actionCalls).toEqual([])
        })
    })
})
