import express from "express"
import request from "supertest"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { SendTemplateInput, SendTemplateResult } from "../clients/gateway.client"
import errorHandler from "../middleware/errorHandler.middleware"
import { createRequireAuth } from "../middleware/auth.middleware"
import { buildAppointmentDetail, conversationEventsOf, FIXED_DATES, FIXED_NOW } from "../repositories/mock/appointment.builders"
import { AppointmentRepositoryStub } from "../repositories/mock/appointmentStub.repository"
import { MockAuthRepository } from "../repositories/mock/authMock.repository"
import { createCitizenNotificationService } from "../services/citizenNotification.service"
import type { AppointmentCalendarService } from "../services/appointmentCalendar.service"
import type { CancellationNoticeTarget } from "../types/appointment.types"
import { sessionTokens } from "../utils/sessionToken"
import { AppointmentRoutes } from "./appointment.routes"

const authUsers = new MockAuthRepository([
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
const VIEWER = 5
const OPERATOR = 10
const PHONE = "5512999990000"
const FIXED_PREVIEW =
    "Olá, Maria. Seu agendamento 1A2B3C4D no PROCON Jacareí, marcado para 05/11 às 14:00, foi cancelado. Motivo: a unidade estará fechada nesta data. Para agendar novamente, envie uma mensagem para este número."

function cookieFor(userId: number): string {
    return `proconchat_access=${sessionTokens.signAccessToken({ userId, sessionVersion: 1 })}`
}

function noticeTarget(overrides: Partial<CancellationNoticeTarget> = {}): CancellationNoticeTarget {
    return {
        status: "CANCELED",
        appointmentDatetime: new Date("2026-11-05T17:00:00.000Z"),
        name: "  Maria  da Silva",
        protocol: "1A2B3C4D",
        phoneEncrypted: "v1:cifrado",
        lastStaffCancelReason: "UNIT_CLOSED",
        lastCancellationNotice: null,
        ...overrides,
    }
}

describe("appointment.routes: cancelamento pela equipe (HTTP)", () => {
    let repository: AppointmentRepositoryStub
    let sendTemplate: ReturnType<typeof vi.fn<(input: SendTemplateInput) => Promise<SendTemplateResult>>>
    let app: express.Express
    const calendar: AppointmentCalendarService = { getCalendar: vi.fn() }

    function buildApp(): express.Express {
        const notifications = createCitizenNotificationService({
            appointments: repository,
            gateway: { sendTemplate },
            decrypt: () => PHONE,
            logger: { log: vi.fn() },
        })
        const built = express()
        built.use(express.json())
        built.use(
            "/api/v1/appointments",
            new AppointmentRoutes({
                repository,
                conversationEvents: conversationEventsOf({}),
                authMiddleware: createRequireAuth({ users: authUsers, tokens: sessionTokens }),
                calendar,
                notifications,
            }).getRouter(),
        )
        built.use(errorHandler)
        return built
    }

    function scenario(notice: CancellationNoticeTarget = noticeTarget()): AppointmentRepositoryStub {
        return new AppointmentRepositoryStub({
            details: [
                buildAppointmentDetail({ id: "1", status: "CONFIRMED", appointment_datetime: "2026-11-05T17:00:00.000Z" }),
                buildAppointmentDetail({ id: "3", status: "CONFIRMED", appointment_datetime: FIXED_DATES.yesterday }),
                buildAppointmentDetail({ id: "6", status: "CANCELED", appointment_datetime: FIXED_DATES.inThreeDays }),
            ],
            noticeTargets: { "1": notice, "3": notice, "6": notice },
            afterAction: (call, current) => ({
                ...current,
                status: "CANCELED",
                events: [
                    {
                        id: String(current.events.length + 1),
                        type: "CANCELED_BY_STAFF",
                        actor_user_id: String(call.actorUserId),
                        actor_user_name: null,
                        data: { reason: "UNIT_CLOSED" },
                        created_at: FIXED_NOW.toISOString(),
                    },
                    ...current.events,
                ],
            }),
        })
    }

    beforeEach(() => {
        vi.useFakeTimers({ toFake: ["Date"] })
        vi.setSystemTime(FIXED_NOW)
        sendTemplate = vi.fn<(input: SendTemplateInput) => Promise<SendTemplateResult>>().mockResolvedValue({
            ok: true,
            providerMessageId: "wamid.X",
        })
        repository = scenario()
        app = buildApp()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it("com só appointments.view, C1, C2 e C3 respondem 403", async () => {
        const cancel = await request(app)
            .patch("/api/v1/appointments/1/status")
            .set("Cookie", cookieFor(VIEWER))
            .send({ action: "cancel", reason: "UNIT_CLOSED" })
        const preview = await request(app).get("/api/v1/appointments/1/cancellation-preview").set("Cookie", cookieFor(VIEWER))
        const retry = await request(app)
            .post("/api/v1/appointments/6/cancellation-notice/retry")
            .set("Cookie", cookieFor(VIEWER))

        expect([cancel.status, preview.status, retry.status]).toEqual([403, 403, 403])
        expect(repository.cancelCalls).toEqual([])
        expect(sendTemplate).not.toHaveBeenCalled()
    })

    it("C1 com motivo inválido responde 400 BAD_REQUEST e não cancela", async () => {
        const res = await request(app)
            .patch("/api/v1/appointments/1/status")
            .set("Cookie", cookieFor(OPERATOR))
            .send({ action: "cancel", reason: "OUTRO" })

        expect(res.status).toBe(400)
        expect(res.body).toEqual({
            error: {
                code: "BAD_REQUEST",
                message: "Dados inválidos: reason: Motivo inválido. Valores aceitos: UNIT_CLOSED, CITIZEN_REQUEST, DUPLICATE, OTHER",
            },
        })
        expect(repository.cancelCalls).toEqual([])
    })

    it("C1 para um horário que já passou responde 409 CANCEL_AFTER_START", async () => {
        const res = await request(app)
            .patch("/api/v1/appointments/3/status")
            .set("Cookie", cookieFor(OPERATOR))
            .send({ action: "cancel", reason: "UNIT_CLOSED" })

        expect(res.status).toBe(409)
        expect(res.body).toEqual({
            error: { code: "CANCEL_AFTER_START", message: "Só é possível cancelar antes do horário do atendimento" },
        })
        expect(sendTemplate).not.toHaveBeenCalled()
    })

    it("C1 com a gravação do aviso e a leitura do detalhe falhando responde 500 genérico, com o cancelamento já gravado", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)
        vi.spyOn(repository, "recordCitizenNotification").mockRejectedValueOnce(new Error("gravação falhou"))
        vi.spyOn(repository, "findById").mockRejectedValueOnce(new Error("leitura falhou"))

        const res = await request(app)
            .patch("/api/v1/appointments/1/status")
            .set("Cookie", cookieFor(OPERATOR))
            .send({ action: "cancel", reason: "UNIT_CLOSED" })
        consoleError.mockRestore()

        expect(res.status).toBe(500)
        expect(res.body).toEqual({ error: { code: "INTERNAL_SERVER_ERROR", message: "Internal Server Error" } })
        expect(repository.cancelCalls).toHaveLength(1)
    })

    it("C1 válido com só a gravação do aviso falhando responde 200 CANCELED e registra no log só o id e o código", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)
        vi.spyOn(repository, "recordCitizenNotification").mockRejectedValueOnce(new Error("gravação falhou"))

        const res = await request(app)
            .patch("/api/v1/appointments/1/status")
            .set("Cookie", cookieFor(OPERATOR))
            .send({ action: "cancel", reason: "UNIT_CLOSED" })
        const logged = [...consoleError.mock.calls]
        consoleError.mockRestore()

        expect(res.status).toBe(200)
        expect(res.body.data.status).toBe("CANCELED")
        expect(repository.cancelCalls).toHaveLength(1)
        expect(logged).toHaveLength(1)
        expect(logged[0]?.[1]).toEqual({ appointmentId: "1", code: "UNKNOWN" })
        expect(JSON.stringify(logged)).not.toContain(PHONE)
    })

    it("C1 válido responde 200 com o detalhe cancelado e os eventos de cancelamento e de aviso", async () => {
        const res = await request(app)
            .patch("/api/v1/appointments/1/status")
            .set("Cookie", cookieFor(OPERATOR))
            .send({ action: "cancel", reason: "UNIT_CLOSED", note: "  Reforma na unidade  " })

        expect(res.status).toBe(200)
        expect(Object.keys(res.body)).toEqual(["data"])
        expect(res.body.data.status).toBe("CANCELED")
        expect(res.body.data.events.map((event: { type: string }) => event.type)).toEqual([
            "CITIZEN_NOTIFIED",
            "CANCELED_BY_STAFF",
            "CREATED",
        ])
        expect(res.body.data.events[0]).toMatchObject({ actor_user_id: String(OPERATOR), data: { kind: "CANCELLATION" } })
        expect(repository.cancelCalls).toEqual([
            { id: "1", actorUserId: OPERATOR, reason: "UNIT_CLOSED", note: "Reforma na unidade", now: FIXED_NOW },
        ])
        expect(JSON.stringify(res.body)).not.toContain(PHONE)
    })

    it("C2 responde 200 com as prévias dos 4 motivos na ordem e o texto do caso fixo", async () => {
        const res = await request(app).get("/api/v1/appointments/1/cancellation-preview").set("Cookie", cookieFor(OPERATOR))

        expect(res.status).toBe(200)
        expect(res.body).toEqual({
            data: {
                previews: [
                    { reason: "UNIT_CLOSED", message: FIXED_PREVIEW },
                    {
                        reason: "CITIZEN_REQUEST",
                        message: FIXED_PREVIEW.replace("a unidade estará fechada nesta data", "cancelamento solicitado por você"),
                    },
                    {
                        reason: "DUPLICATE",
                        message: FIXED_PREVIEW.replace(
                            "a unidade estará fechada nesta data",
                            "foi identificado outro agendamento em seu nome",
                        ),
                    },
                    {
                        reason: "OTHER",
                        message: FIXED_PREVIEW.replace(
                            "a unidade estará fechada nesta data",
                            "não será possível realizar o atendimento neste horário",
                        ),
                    },
                ],
            },
        })
    })

    it("C2 com um id inexistente responde 404", async () => {
        const res = await request(app).get("/api/v1/appointments/999/cancellation-preview").set("Cookie", cookieFor(OPERATOR))

        expect(res.status).toBe(404)
        expect(res.body).toEqual({ error: { code: "NOT_FOUND", message: "Agendamento não encontrado" } })
    })

    it("C3 responde 409 NOTIFICATION_NOT_RETRYABLE quando o último aviso foi entregue", async () => {
        repository = scenario(noticeTarget({ lastCancellationNotice: "NOTIFIED" }))
        app = buildApp()

        const res = await request(app)
            .post("/api/v1/appointments/6/cancellation-notice/retry")
            .set("Cookie", cookieFor(OPERATOR))

        expect(res.status).toBe(409)
        expect(res.body).toEqual({
            error: { code: "NOTIFICATION_NOT_RETRYABLE", message: "Não há aviso de cancelamento com falha para reenviar" },
        })
        expect(sendTemplate).not.toHaveBeenCalled()
    })

    it("C3 responde 200 com o detalhe quando o último aviso falhou", async () => {
        repository = scenario(noticeTarget({ lastCancellationNotice: "FAILED" }))
        app = buildApp()

        const res = await request(app)
            .post("/api/v1/appointments/6/cancellation-notice/retry")
            .set("Cookie", cookieFor(OPERATOR))

        expect(res.status).toBe(200)
        expect(Object.keys(res.body)).toEqual(["data"])
        expect(res.body.data).toMatchObject({ id: "6", status: "CANCELED" })
        expect(res.body.data.events[0]).toMatchObject({
            type: "CITIZEN_NOTIFIED",
            actor_user_id: String(OPERATOR),
            data: { kind: "CANCELLATION" },
        })
        expect(sendTemplate).toHaveBeenCalledTimes(1)
    })

    it("C3 com o último aviso ainda sem registro envia uma vez e grava o aviso como entregue", async () => {
        const res = await request(app)
            .post("/api/v1/appointments/6/cancellation-notice/retry")
            .set("Cookie", cookieFor(OPERATOR))

        expect(res.status).toBe(200)
        expect(sendTemplate).toHaveBeenCalledTimes(1)
        expect(repository.notificationCalls).toHaveLength(1)
        expect(repository.notificationCalls[0]).toMatchObject({ id: "6", outcome: "NOTIFIED", kind: "CANCELLATION" })
    })
})
