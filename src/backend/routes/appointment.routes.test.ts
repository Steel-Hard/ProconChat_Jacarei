import express from "express"
import request from "supertest"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import errorHandler from "../middleware/errorHandler.middleware"
import { createRequireAuth } from "../middleware/auth.middleware"
import { MockAppointmentRepository } from "../repositories/mock/appointmentMock.repository"
import { MockAuthRepository } from "../repositories/mock/authMock.repository"
import { sessionTokens } from "../utils/sessionToken"
import { createAppointmentRoutes } from "./appointment.routes"

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

describe("appointment.routes (HTTP)", () => {
    let app: express.Express
    let repository: MockAppointmentRepository
    const mockConversationEvents: ConversationEventService = {
        record: vi.fn(),
        finish: vi.fn(),
        listBySession: vi.fn().mockResolvedValue([]),
    }

    function buildApp(conversationEvents: ConversationEventService): express.Express {
        const authMiddleware = createRequireAuth({ users: authUsers, tokens: sessionTokens })
        const built = express()
        built.use(express.json())
        built.use("/api/v1/appointments", createAppointmentRoutes(repository, conversationEvents, authMiddleware))
        built.use(errorHandler)
        return built
    }

    beforeEach(() => {
        repository = new MockAppointmentRepository(true)
        app = buildApp(mockConversationEvents)
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
            expect(res.body.data.chipCounts).toBeDefined()
            expect(res.body.data.chipCounts.all).toBe(9)
        })

        it("retorna todos os agendamentos quando period=all", async () => {
            const res = await request(app)
                .get("/api/v1/appointments?period=all")
                .set("Cookie", accessCookieFor(1))

            expect(res.status).toBe(200)
            expect(res.body.data.total).toBe(9)
        })

        it("filtra por status PENDING", async () => {
            const res = await request(app)
                .get("/api/v1/appointments?status=PENDING")
                .set("Cookie", accessCookieFor(1))

            expect(res.status).toBe(200)
            expect(
                res.body.data.items.every((a: { status: string }) => a.status === "PENDING"),
            ).toBe(true)
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
            const res = await request(app)
                .get("/api/v1/appointments/1")
                .set("Cookie", accessCookieFor(1))

            expect(res.status).toBe(200)
            expect(res.body.data.id).toBe("1")
            expect(res.body.data.name).toBe("Maria Silva")
            expect(res.body.data.documents_sent).toBeDefined()
            expect(res.body.data.events).toBeInstanceOf(Array)
            expect(res.body.data.timeline).toBeInstanceOf(Array)
        })

        it("devolve o protocolo em maiúsculas no detalhe e na lista", async () => {
            const detailRes = await request(app)
                .get("/api/v1/appointments/1")
                .set("Cookie", accessCookieFor(1))
            const listRes = await request(app)
                .get("/api/v1/appointments?search=a1b2c3d4")
                .set("Cookie", accessCookieFor(1))

            expect(detailRes.body.data.protocol).toBe("A1B2C3D4")
            expect(listRes.body.data.items[0].protocol).toBe("A1B2C3D4")
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
                })
            })

            it("informa as ações disponíveis de um confirmado de hoje antes do horário", async () => {
                vi.useFakeTimers({ toFake: ["Date"] })
                vi.setSystemTime(new Date("2026-10-20T10:00:00-03:00"))
                repository.appointments.find((a) => a.id === 2)!.appointment_datetime = new Date(
                    "2026-10-20T15:00:00-03:00",
                )

                const res = await request(app)
                    .get("/api/v1/appointments/2")
                    .set("Cookie", accessCookieFor(1))

                expect(res.body.data.available_actions).toEqual({
                    claim: { allowed: false, code: "APPOINTMENT_ALREADY_CLAIMED" },
                    attended: { allowed: true, code: null },
                    no_show: { allowed: false, code: "NO_SHOW_NOT_YET_AVAILABLE" },
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
            const appWithTimeline = buildApp(repository.conversationEventService())

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

        it("executa ação claim via PATCH /status", async () => {
            const res = await request(app)
                .patch("/api/v1/appointments/1/status")
                .set("Cookie", accessCookieFor(10))
                .send({ action: "claim" })

            expect(res.status).toBe(200)
            expect(res.body.data.status).toBe("CONFIRMED")
            expect(res.body.data.assigned_user_id).toBe("10")
        })

        it("executa ação attended com sucesso para agendamento de hoje", async () => {
            const res = await request(app)
                .patch("/api/v1/appointments/7/status")
                .set("Cookie", accessCookieFor(10))
                .send({ action: "attended" })

            expect(res.status).toBe(200)
            expect(res.body.data.status).toBe("ATTENDED")
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
})
