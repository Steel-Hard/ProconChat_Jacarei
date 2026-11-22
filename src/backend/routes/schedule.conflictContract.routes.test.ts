import express from "express"
import request from "supertest"
import { describe, expect, it, vi } from "vitest"
import errorHandler from "../middleware/errorHandler.middleware"
import { createRequireAuth } from "../middleware/auth.middleware"
import { createScheduleStubRepository } from "../repositories/mock/scheduleStub.repository"
import { ScheduleRoutes } from "./schedule.routes"
import { createScheduleService } from "../services/schedule.service"
import { buildScheduleConfigInput } from "../services/mock/scheduleConfig.builders"
import { previewScheduleBodySchema } from "../schemas/schedule.schema"
import { AuthenticatedUser } from "../types/auth.types"
import { sessionTokens } from "../utils/sessionToken"

const MANAGER: AuthenticatedUser = {
    id: 2,
    name: "Gestor",
    email: "gestor@procon.sp.gov.br",
    isAdmin: false,
    permissions: ["schedule.configure", "appointments.manage"],
    sessionVersion: 0,
}

const MANAGER_COOKIE = `proconchat_access=${sessionTokens.signAccessToken({ userId: 2, sessionVersion: 0 })}`

function buildApp() {
    const repo = createScheduleStubRepository()
    const service = createScheduleService(repo, {
        cancellationNotice: {
            getState: vi.fn().mockResolvedValue({ enabled: true, problem: null }),
        },
        notifications: {
            notifyCancellation: vi.fn().mockResolvedValue("NOTIFIED"),
        },
    })
    const authMiddleware = createRequireAuth({
        users: { findActiveById: async () => MANAGER },
        tokens: sessionTokens,
    })
    const app = express()
    app.use(express.json())
    app.use("/api/v1/schedule", new ScheduleRoutes({ repository: repo, service, authMiddleware }).getRouter())
    app.use(errorHandler)
    return app
}

function issuePathsOf(response: request.Response): string[] {
    return response.body.error.details.issues.map((issue: { path: string }) => issue.path)
}

function putSchedule(body: Record<string, unknown>) {
    return request(buildApp())
        .put("/api/v1/schedule")
        .set("Cookie", MANAGER_COOKIE)
        .send({ ...buildScheduleConfigInput({ ranges: [] }), ...body })
}

function putScheduledVersion(body: Record<string, unknown>) {
    return request(buildApp())
        .put("/api/v1/schedule/versions/2027-11-01")
        .set("Cookie", MANAGER_COOKIE)
        .send({ ...buildScheduleConfigInput({ ranges: [] }), ...body })
}

function deleteVersion(body?: Record<string, unknown>) {
    const call = request(buildApp()).delete("/api/v1/schedule/versions/2027-11-01").set("Cookie", MANAGER_COOKIE)
    return body ? call.send(body) : call
}

describe("contrato de conflitos nos PUT", () => {
    it("recusa conflictResolution CANCEL sem seenConflictIds", async () => {
        const response = await putSchedule({ conflictResolution: "CANCEL", seenNoticeEnabled: true })

        expect(response.status).toBe(400)
        expect(issuePathsOf(response)).toContain("seenConflictIds")
    })

    it("recusa seenConflictIds sem conflictResolution", async () => {
        const response = await putSchedule({ seenConflictIds: ["10"] })

        expect(response.status).toBe(400)
        expect(issuePathsOf(response)).toContain("seenConflictIds")
    })

    it("recusa seenNoticeEnabled sem conflictResolution", async () => {
        const response = await putSchedule({ seenNoticeEnabled: true })

        expect(response.status).toBe(400)
        expect(issuePathsOf(response)).toContain("seenNoticeEnabled")
    })

    it("recusa CANCEL sem seenNoticeEnabled", async () => {
        const response = await putSchedule({ conflictResolution: "CANCEL", seenConflictIds: ["10"] })

        expect(response.status).toBe(400)
        expect(issuePathsOf(response)).toContain("seenNoticeEnabled")
    })

    it("recusa KEEP com seenNoticeEnabled", async () => {
        const response = await putSchedule({
            conflictResolution: "KEEP",
            seenConflictIds: ["10"],
            seenNoticeEnabled: false,
        })

        expect(response.status).toBe(400)
        expect(issuePathsOf(response)).toContain("seenNoticeEnabled")
    })

    it.each([
        ["vazio", ""],
        ["com letras", "12a"],
        ["com zero à esquerda", "012"],
        ["com mais de 19 dígitos", "12345678901234567890"],
        ["negativo", "-1"],
    ])("recusa id %s em seenConflictIds", async (_label, id) => {
        const response = await putSchedule({ conflictResolution: "KEEP", seenConflictIds: [id] })

        expect(response.status).toBe(400)
        expect(issuePathsOf(response)).toContain("seenConflictIds.0")
    })

    it("recusa id repetido em seenConflictIds", async () => {
        const response = await putSchedule({ conflictResolution: "KEEP", seenConflictIds: ["10", "10"] })

        expect(response.status).toBe(400)
        expect(issuePathsOf(response)).toContain("seenConflictIds")
    })

    it("recusa seenConflictIds vazio", async () => {
        const response = await putSchedule({ conflictResolution: "KEEP", seenConflictIds: [] })

        expect(response.status).toBe(400)
        expect(issuePathsOf(response)).toContain("seenConflictIds")
    })

    it("recusa seenConflictIds com mais de 5000 itens", async () => {
        const ids = Array.from({ length: 5001 }, (_unused, index) => String(index + 1))
        const response = await putSchedule({ conflictResolution: "KEEP", seenConflictIds: ids })

        expect(response.status).toBe(400)
        expect(issuePathsOf(response)).toContain("seenConflictIds")
    })

    it("aceita seenConflictIds com 5000 itens", async () => {
        const ids = Array.from({ length: 5000 }, (_unused, index) => String(index + 1))
        const response = await putSchedule({ conflictResolution: "KEEP", seenConflictIds: ids })

        expect(response.status).not.toBe(400)
    })

    it("aplica as mesmas regras no PUT de mudança agendada", async () => {
        const response = await putScheduledVersion({ conflictResolution: "CANCEL", seenNoticeEnabled: true })

        expect(response.status).toBe(400)
        expect(issuePathsOf(response)).toContain("seenConflictIds")
    })

    it("aceita KEEP com seenConflictIds válidos no PUT de mudança agendada", async () => {
        const response = await putScheduledVersion({ conflictResolution: "KEEP", seenConflictIds: ["10"] })

        expect(response.status).not.toBe(400)
    })
})

describe("contrato de conflitos no DELETE", () => {
    it("aceita DELETE sem corpo e responde 204", async () => {
        const response = await deleteVersion()

        expect(response.status).toBe(204)
    })

    it("recusa corpo com CANCEL sem seenConflictIds", async () => {
        const response = await deleteVersion({ conflictResolution: "CANCEL", seenNoticeEnabled: true })

        expect(response.status).toBe(400)
        expect(issuePathsOf(response)).toContain("seenConflictIds")
    })

    it("recusa corpo com seenConflictIds sem conflictResolution", async () => {
        const response = await deleteVersion({ seenConflictIds: ["10"] })

        expect(response.status).toBe(400)
        expect(issuePathsOf(response)).toContain("seenConflictIds")
    })

    it("recusa corpo com KEEP e seenNoticeEnabled", async () => {
        const response = await deleteVersion({
            conflictResolution: "KEEP",
            seenConflictIds: ["10"],
            seenNoticeEnabled: true,
        })

        expect(response.status).toBe(400)
        expect(issuePathsOf(response)).toContain("seenNoticeEnabled")
    })

    it("ignora o parâmetro de endereço conflictResolution", async () => {
        const response = await request(buildApp())
            .delete("/api/v1/schedule/versions/2027-11-01?conflictResolution=CANCEL")
            .set("Cookie", MANAGER_COOKIE)

        expect(response.status).toBe(204)
    })
})

describe("POST /preview", () => {
    it("não deixa os campos de resolução entrarem em config", () => {
        const parsed = previewScheduleBodySchema.parse({
            month: "2027-11",
            config: {
                ...buildScheduleConfigInput({ ranges: [] }),
                conflictResolution: "CANCEL",
                seenConflictIds: ["10"],
                seenNoticeEnabled: true,
            },
        })

        expect(parsed.config).not.toHaveProperty("conflictResolution")
        expect(parsed.config).not.toHaveProperty("seenConflictIds")
        expect(parsed.config).not.toHaveProperty("seenNoticeEnabled")
    })
})
