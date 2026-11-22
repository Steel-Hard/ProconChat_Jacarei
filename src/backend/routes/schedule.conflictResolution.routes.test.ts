import express from "express"
import request from "supertest"
import { describe, expect, it, vi } from "vitest"
import errorHandler from "../middleware/errorHandler.middleware"
import { createRequireAuth } from "../middleware/auth.middleware"
import { createScheduleStubRepository, DEFAULT_STUB_NOW } from "../repositories/mock/scheduleStub.repository"
import { ScheduleRoutes } from "./schedule.routes"
import { createScheduleService } from "../services/schedule.service"
import { buildScheduleConfigInput } from "../services/mock/scheduleConfig.builders"
import { AuthenticatedUser } from "../types/auth.types"
import { sessionTokens } from "../utils/sessionToken"

const USERS = new Map<number, AuthenticatedUser>([
    [
        1,
        {
            id: 1,
            name: "Configurador",
            email: "config@procon.sp.gov.br",
            isAdmin: false,
            permissions: ["schedule.configure"],
            sessionVersion: 0,
        },
    ],
    [
        2,
        {
            id: 2,
            name: "Gestor",
            email: "gestor@procon.sp.gov.br",
            isAdmin: false,
            permissions: ["schedule.configure", "appointments.manage"],
            sessionVersion: 0,
        },
    ],
])

function cookieOf(userId: number): string {
    return `proconchat_access=${sessionTokens.signAccessToken({ userId, sessionVersion: 0 })}`
}

function buildApp() {
    const repo = createScheduleStubRepository({
        appointments: [
            {
                id: "10",
                protocol: "AAA11111",
                name: "Maria",
                cpfMasked: "***.111.222-**",
                appointmentDatetime: new Date("2027-10-06T08:00:00-03:00"),
                requestDatetime: DEFAULT_STUB_NOW,
                status: "CONFIRMED",
                assignedUserId: null,
                offGrid: false,
            },
        ],
    })
    const service = createScheduleService(repo, {
        cancellationNotice: {
            isEnabled: vi.fn().mockResolvedValue(true),
            getState: vi.fn().mockResolvedValue({ enabled: true, problem: null }),
        },
        notifications: {
            notifyCancellation: vi.fn().mockResolvedValue("NOTIFIED"),
        },
    })
    const authMiddleware = createRequireAuth({
        users: {
            findActiveById: async (id) => USERS.get(id) ?? null,
        },
        tokens: sessionTokens,
    })
    const app = express()
    app.use(express.json())
    app.use("/api/v1/schedule", new ScheduleRoutes({ repository: repo, service, authMiddleware }).getRouter())
    app.use(errorHandler)
    return app
}

describe("schedule.routes conflict resolution", () => {
    it("retorna o estado do aviso de cancelamento em GET /cancellation-notice", async () => {
        const app = buildApp()
        const response = await request(app)
            .get("/api/v1/schedule/cancellation-notice")
            .set("Cookie", cookieOf(1))

        expect(response.status).toBe(200)
        expect(response.body).toEqual({ data: { enabled: true, problem: null } })
    })

    it("permite KEEP mas bloqueia CANCEL sem permissão appointments.manage", async () => {
        const app = buildApp()
        const cancelRes = await request(app)
            .put("/api/v1/schedule")
            .set("Cookie", cookieOf(1))
            .send(buildScheduleConfigInput({
                ranges: [],
                conflictResolution: "CANCEL",
                seenConflictIds: ["10"],
                seenNoticeEnabled: true,
            }))

        expect(cancelRes.status).toBe(403)
        expect(cancelRes.body.error.code).toBe("FORBIDDEN")

        const keepRes = await request(app)
            .put("/api/v1/schedule")
            .set("Cookie", cookieOf(1))
            .send(buildScheduleConfigInput({ ranges: [], conflictResolution: "KEEP", seenConflictIds: ["10"] }))

        expect(keepRes.status).toBe(200)
        expect(keepRes.body.resolution).toEqual({
            action: "KEEP",
            affectedCount: 1,
            notifiedCount: 0,
            failedCount: 0,
            noticeDisabled: false,
        })
    })

    it("permite CANCEL com schedule.configure e appointments.manage e retorna o resumo", async () => {
        const app = buildApp()
        const response = await request(app)
            .put("/api/v1/schedule")
            .set("Cookie", cookieOf(2))
            .send(buildScheduleConfigInput({
                ranges: [],
                conflictResolution: "CANCEL",
                seenConflictIds: ["10"],
                seenNoticeEnabled: true,
            }))

        expect(response.status).toBe(200)
        expect(response.body.resolution).toEqual({
            action: "CANCEL",
            affectedCount: 1,
            notifiedCount: 1,
            failedCount: 0,
            noticeDisabled: false,
        })
    })

    it("bloqueia DELETE /versions com conflictResolution CANCEL sem appointments.manage", async () => {
        const app = buildApp()
        const response = await request(app)
            .delete("/api/v1/schedule/versions/2027-11-01")
            .set("Cookie", cookieOf(1))
            .send({ conflictResolution: "CANCEL", seenConflictIds: ["10"], seenNoticeEnabled: true })

        expect(response.status).toBe(403)
        expect(response.body.error.code).toBe("FORBIDDEN")
    })

    it("responde 409 SCHEDULE_CONFLICTS_CHANGED em PUT /schedule quando a lista vista é diferente da refeita", async () => {
        const app = buildApp()
        const response = await request(app)
            .put("/api/v1/schedule")
            .set("Cookie", cookieOf(2))
            .send(
                buildScheduleConfigInput({
                    ranges: [],
                    conflictResolution: "CANCEL",
                    seenConflictIds: ["10", "11"],
                    seenNoticeEnabled: true,
                }),
            )

        expect(response.status).toBe(409)
        expect(response.body.error.code).toBe("SCHEDULE_CONFLICTS_CHANGED")
        expect(response.body.error.details).toMatchObject({
            conflicts: [expect.objectContaining({ id: "10" })],
            cancellationNotice: { enabled: true, problem: null },
            changes: ["CONFLICTS"],
        })
    })

    it("responde 409 SCHEDULE_CONFLICTS_CHANGED em PUT /versions quando a lista vista é diferente da refeita", async () => {
        const app = buildApp()
        const response = await request(app)
            .put("/api/v1/schedule/versions/2027-10-04")
            .set("Cookie", cookieOf(2))
            .send(
                buildScheduleConfigInput({
                    ranges: [],
                    conflictResolution: "KEEP",
                    seenConflictIds: ["99"],
                }),
            )

        expect(response.status).toBe(409)
        expect(response.body.error.code).toBe("SCHEDULE_CONFLICTS_CHANGED")
    })
})
