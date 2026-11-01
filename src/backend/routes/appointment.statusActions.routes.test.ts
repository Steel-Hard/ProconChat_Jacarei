import express from "express"
import request from "supertest"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { SendTemplateInput, SendTemplateResult } from "../clients/gateway.client"
import errorHandler from "../middleware/errorHandler.middleware"
import { createRequireAuth } from "../middleware/auth.middleware"
import { buildAppointmentDetail, conversationEventsOf, FIXED_DATES, FIXED_NOW } from "../repositories/mock/appointment.builders"
import { AppointmentRepositoryStub } from "../repositories/mock/appointmentStub.repository"
import { MockAuthRepository } from "../repositories/mock/authMock.repository"
import type { UpdateStatusBody } from "../schemas/appointment.schema"
import type { AppointmentCalendarService } from "../services/appointmentCalendar.service"
import { createCitizenNotificationService } from "../services/citizenNotification.service"
import { sessionTokens } from "../utils/sessionToken"
import { AppointmentRoutes } from "./appointment.routes"

const OPERATOR = 10
const authUsers = new MockAuthRepository([
    {
        id: OPERATOR,
        email: "operator@exemplo.test",
        passwordHash: "x",
        name: "Operator",
        isAdmin: false,
        permissions: ["appointments.manage", "appointments.view"],
        sessionVersion: 1,
    },
])

const BRANCH_OF_ACTION: Record<UpdateStatusBody["action"], { id: string; body: Record<string, unknown> }> = {
    claim: { id: "1", body: { action: "claim" } },
    attended: { id: "2", body: { action: "attended" } },
    no_show: { id: "3", body: { action: "no_show" } },
    assign: { id: "4", body: { action: "assign", assigneeUserId: 2 } },
    correct_record: { id: "5", body: { action: "correct_record" } },
    cancel: { id: "6", body: { action: "cancel", reason: "UNIT_CLOSED" } },
}

describe("appointment.routes: cada ação do PATCH /status chega ao seu ramo (HTTP)", () => {
    let repository: AppointmentRepositoryStub
    let app: express.Express
    const calendar: AppointmentCalendarService = { getCalendar: vi.fn() }
    const sendTemplate = vi.fn<(input: SendTemplateInput) => Promise<SendTemplateResult>>()

    beforeEach(() => {
        vi.useFakeTimers({ toFake: ["Date"] })
        vi.setSystemTime(FIXED_NOW)
        sendTemplate.mockReset().mockResolvedValue({ ok: true, providerMessageId: "wamid.X" })
        repository = new AppointmentRepositoryStub({
            details: [
                buildAppointmentDetail({ id: "1", status: "PENDING", appointment_datetime: FIXED_DATES.tomorrow }),
                buildAppointmentDetail({ id: "2", status: "PENDING", appointment_datetime: FIXED_DATES.todayEarly }),
                buildAppointmentDetail({ id: "3", status: "CONFIRMED", appointment_datetime: FIXED_DATES.yesterday }),
                buildAppointmentDetail({ id: "4", status: "PENDING", appointment_datetime: FIXED_DATES.tomorrow }),
                buildAppointmentDetail({ id: "5", status: "ATTENDED", appointment_datetime: FIXED_DATES.threeDaysAgo }),
                buildAppointmentDetail({ id: "6", status: "CONFIRMED", appointment_datetime: FIXED_DATES.tomorrow }),
            ],
            noticeTargets: {
                "6": {
                    status: "CANCELED",
                    appointmentDatetime: new Date(FIXED_DATES.tomorrow),
                    name: "Maria Silva",
                    protocol: "A1B2C3D4",
                    phoneEncrypted: "v1:cifrado",
                    lastStaffCancelReason: "UNIT_CLOSED",
                    lastCancellationNotice: null,
                },
            },
            afterAction: (_call, current) => current,
        })
        const notifications = createCitizenNotificationService({
            appointments: repository,
            gateway: { sendTemplate },
            decrypt: () => "5512999990000",
            logger: { log: vi.fn() },
        })
        app = express()
        app.use(express.json())
        app.use(
            "/api/v1/appointments",
            new AppointmentRoutes({
                repository,
                conversationEvents: conversationEventsOf({}),
                authMiddleware: createRequireAuth({ users: authUsers, tokens: sessionTokens }),
                calendar,
                notifications,
            }).getRouter(),
        )
        app.use(errorHandler)
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it.each(Object.entries(BRANCH_OF_ACTION))("a ação %s chama só o próprio ramo e responde 200", async (action, { id, body }) => {
        const cookie = `proconchat_access=${sessionTokens.signAccessToken({ userId: OPERATOR, sessionVersion: 1 })}`

        const res = await request(app).patch(`/api/v1/appointments/${id}/status`).set("Cookie", cookie).send(body)

        expect(res.status).toBe(200)
        expect(res.body.data.id).toBe(id)
        expect(repository.actionCalls.map((call) => call.action)).toEqual([action])
    })
})
