import express from "express"
import request from "supertest"
import { beforeEach, describe, expect, it } from "vitest"
import { createRequireAuth } from "../middleware/auth.middleware"
import errorHandler from "../middleware/errorHandler.middleware"
import { MockAuthRepository } from "../repositories/mock/authMock.repository"
import { createReportStubRepository } from "../repositories/mock/reportStub.repository"
import { sessionTokens } from "../utils/sessionToken"
import { ReportRoutes } from "./report.routes"

const ADMIN_ID = 1
const REPORT_VIEWER_ID = 2
const OTHER_USER_ID = 3

const authUsers = new MockAuthRepository([
    {
        id: ADMIN_ID,
        email: "admin@exemplo.test",
        passwordHash: "x",
        name: "Marcos Costa",
        isAdmin: true,
    },
    {
        id: REPORT_VIEWER_ID,
        email: "analista@exemplo.test",
        passwordHash: "x",
        name: "Patrícia Lima",
        permissions: ["reports.view"],
    },
    {
        id: OTHER_USER_ID,
        email: "atendente@exemplo.test",
        passwordHash: "x",
        name: "Lucas",
        permissions: ["appointments.view"],
    },
])

function cookieOf(userId: number): string {
    return `proconchat_access=${sessionTokens.signAccessToken({ userId, sessionVersion: 0 })}`
}

describe("report.routes (HTTP)", () => {
    let repository: ReturnType<typeof createReportStubRepository>
    let app: express.Express

    beforeEach(() => {
        repository = createReportStubRepository({
            outcomes: [
                { outcome: "RESOLVED", count: 8 },
                { outcome: "SCHEDULED", count: 2 },
            ],
            dailyConversations: [
                {
                    date: "2026-10-01",
                    conversations: 10,
                    appointmentsCreated: 2,
                },
            ],
            topCategories: [
                {
                    categoryId: "1",
                    title: "Compras",
                    conversationsCount: 7,
                },
            ],
            topQuestions: [
                {
                    questionId: "3",
                    question: "Prazo de troca",
                    shortTitle: "Troca",
                    categoryId: "1",
                    categoryTitle: "Compras",
                    conversationsCount: 5,
                },
            ],
            appointmentsResult: {
                attended: 3,
                noShow: 1,
                canceled: 1,
                waitingRecord: 0,
                upcoming: 1,
            },
        })

        const authMiddleware = createRequireAuth({
            users: authUsers,
            tokens: sessionTokens,
        })
        app = express()
        app.use(express.json())
        app.use(
            "/api/v1/reports",
            new ReportRoutes({ repository, authMiddleware }).getRouter(),
        )
        app.use(errorHandler)
    })

    it("responde 401 em GET /api/v1/reports sem autenticação", async () => {
        const response = await request(app).get("/api/v1/reports")

        expect(response.status).toBe(401)
        expect(response.body.error.code).toBe("UNAUTHORIZED")
    })

    it("responde 403 FORBIDDEN em GET /api/v1/reports sem permissão reports.view", async () => {
        const response = await request(app)
            .get("/api/v1/reports")
            .set("Cookie", cookieOf(OTHER_USER_ID))

        expect(response.status).toBe(403)
        expect(response.body).toEqual({
            error: { code: "FORBIDDEN", message: "Insufficient permission" },
        })
    })

    it("permite acesso para conta com permissão reports.view e inclui Cache-Control no-store", async () => {
        const response = await request(app)
            .get("/api/v1/reports?period=7d")
            .set("Cookie", cookieOf(REPORT_VIEWER_ID))

        expect(response.status).toBe(200)
        expect(response.headers["cache-control"]).toBe("no-store")
        expect(response.body.data.period.preset).toBe("7d")
        expect(response.body.data.conversations.total).toBe(10)
        expect(response.body.data.appointmentsResult.noShowRate).toBe(25)
    })

    it("permite acesso para conta Admin", async () => {
        const response = await request(app)
            .get("/api/v1/reports?period=30d")
            .set("Cookie", cookieOf(ADMIN_ID))

        expect(response.status).toBe(200)
        expect(response.body.data.period.preset).toBe("30d")
    })

    it("responde 400 BAD_REQUEST com details.issues quando query é inválida", async () => {
        const response = await request(app)
            .get("/api/v1/reports?period=custom&startDate=2026-10-10")
            .set("Cookie", cookieOf(REPORT_VIEWER_ID))

        expect(response.status).toBe(400)
        expect(response.body.error.code).toBe("BAD_REQUEST")
        expect(response.body.error.details).toEqual({
            issues: [
                {
                    path: "endDate",
                    message: "Data final obrigatória no período personalizado",
                },
            ],
        })
    })
})
