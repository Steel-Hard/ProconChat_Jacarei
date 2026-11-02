import request from "supertest"
import { beforeEach, describe, expect, test, vi } from "vitest"
import app from "../app"
import { authRepository } from "../repositories/auth.repository"
import { privacySettingsRepository } from "../repositories/privacySettings.repository"
import { PrivacySettingsStubRepository } from "../repositories/mock/privacySettingsStub.repository"
import { RetentionStubRepository } from "../repositories/mock/retentionStub.repository"
import { retentionRepository } from "../repositories/retention.repository"
import { PERMISSIONS } from "../types/auth.types"
import { sessionTokens } from "../utils/sessionToken"

vi.mock("../repositories/auth.repository", () => ({
    authRepository: { findActiveById: vi.fn() },
}))

vi.mock("../repositories/retention.repository", async () => {
    const { RetentionStubRepository: Repository } = await import("../repositories/mock/retentionStub.repository")
    return { retentionRepository: new Repository() }
})

vi.mock("../repositories/privacySettings.repository", async () => {
    const { PrivacySettingsStubRepository: Repository } = await import("../repositories/mock/privacySettingsStub.repository")
    return { privacySettingsRepository: new Repository() }
})

const ORIGIN = "http://localhost:5173"
const admin = { id: 1, name: "Admin", email: "admin@exemplo.test", isAdmin: true, permissions: [...PERMISSIONS], sessionVersion: 0 }
const staff = { id: 2, name: "Equipe", email: "equipe@exemplo.test", isAdmin: false, permissions: [...PERMISSIONS], sessionVersion: 0 }
const privacy = privacySettingsRepository as unknown as PrivacySettingsStubRepository
const retention = retentionRepository as unknown as RetentionStubRepository
const PREVIEW_PATH = "/api/v1/whatsapp/settings/privacy/retention-preview"

const adminRoutes = [
    { method: "get", path: "/api/v1/whatsapp/settings/privacy" },
    { method: "put", path: "/api/v1/whatsapp/settings/privacy" },
] as const

const validBody = {
    controllerName: "Prefeitura de Jacareí",
    dpoName: "Maria Encarregada",
    contactEmail: "privacidade@exemplo.test",
    inPersonContact: null,
    retentionText: "Sessões por 12 meses.",
    retentionEnabled: false,
    sessionRetentionDays: 90,
    appointmentRetentionDays: 365,
}

function cookieFor(user: { id: number; sessionVersion: number }): string {
    return `proconchat_access=${sessionTokens.signAccessToken({ userId: user.id, sessionVersion: user.sessionVersion })}`
}

describe("rotas da configuracao de privacidade", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        privacy.row = null
        privacy.findError = null
        privacy.saveCalls.length = 0
        retention.counts = { sessions: 0, appointments: 0 }
        retention.countDueCalls.length = 0
        vi.mocked(authRepository.findActiveById).mockImplementation(async (id) => (id === admin.id ? admin : id === staff.id ? staff : null))
    })

    test.each(adminRoutes)("$method $path responde 401 sem sessao", async ({ method, path }) => {
        const response = await request(app)[method](path).set("Origin", ORIGIN).send(validBody)

        expect(response.status).toBe(401)
        expect(response.body).toEqual({ error: { code: "UNAUTHORIZED", message: "Authentication required" } })
    })

    test.each(adminRoutes)("$method $path responde 403 para quem nao e Admin", async ({ method, path }) => {
        const response = await request(app)[method](path).set("Origin", ORIGIN).set("Cookie", cookieFor(staff)).send(validBody)

        expect(response.status).toBe(403)
        expect(response.body).toEqual({ error: { code: "FORBIDDEN", message: "Insufficient permission" } })
    })

    test("PUT com e-mail sem @ responde 400 apontando o campo e nao grava", async () => {
        const response = await request(app)
            .put("/api/v1/whatsapp/settings/privacy")
            .set("Origin", ORIGIN)
            .set("Cookie", cookieFor(admin))
            .send({ ...validBody, contactEmail: "sem-arroba" })

        expect(response.status).toBe(400)
        expect(response.body.error.code).toBe("BAD_REQUEST")
        expect(response.body.error.details.issues[0].path).toBe("contactEmail")
        expect(privacy.saveCalls).toHaveLength(0)
    })

    test("GET publico sem sessao devolve os cinco textos e os prazos com no-store", async () => {
        privacy.row = { ...validBody, updatedBy: { id: 1, name: "Admin" }, updatedAt: new Date("2026-11-01T12:00:00.000Z") }

        const response = await request(app).get("/api/v1/privacy")

        expect(response.status).toBe(200)
        expect(Object.keys(response.body.data)).toEqual([
            "controllerName",
            "dpoName",
            "contactEmail",
            "inPersonContact",
            "retentionText",
            "retentionEnabled",
            "sessionRetentionDays",
            "appointmentRetentionDays",
        ])
        expect(response.body).toEqual({ data: validBody })
        expect(response.headers["cache-control"]).toBe("no-store")
    })

    test("GET do Admin sem linha no banco devolve os textos null e os prazos padrao", async () => {
        const response = await request(app).get("/api/v1/whatsapp/settings/privacy").set("Origin", ORIGIN).set("Cookie", cookieFor(admin))

        expect(response.status).toBe(200)
        expect(response.body).toEqual({
            data: {
                controllerName: null,
                dpoName: null,
                contactEmail: null,
                inPersonContact: null,
                retentionText: null,
                retentionEnabled: false,
                sessionRetentionDays: 90,
                appointmentRetentionDays: 365,
                updatedBy: null,
                updatedAt: null,
            },
        })
    })

    test.each([
        { label: "sem Origin", origin: undefined },
        { label: "com Origin de outro site", origin: "https://evil.test" },
    ])("PUT do Admin $label responde 403 INVALID_ORIGIN e nao grava", async ({ origin }) => {
        privacy.row = { ...validBody, updatedBy: { id: 1, name: "Admin" }, updatedAt: new Date("2026-11-01T12:00:00.000Z") }
        const before = { ...privacy.row }
        const call = request(app).put("/api/v1/whatsapp/settings/privacy").set("Cookie", cookieFor(admin))

        const response = await (origin === undefined ? call : call.set("Origin", origin)).send({ ...validBody, controllerName: "Outro nome" })

        expect(response.status).toBe(403)
        expect(response.body).toEqual({ error: { code: "INVALID_ORIGIN", message: "Request origin is not allowed" } })
        expect(privacy.saveCalls).toHaveLength(0)
        expect(privacy.row).toEqual(before)
    })

    test("PUT com prazo das conversas 29 responde 400 apontando o campo e nao grava", async () => {
        const response = await request(app)
            .put("/api/v1/whatsapp/settings/privacy")
            .set("Origin", ORIGIN)
            .set("Cookie", cookieFor(admin))
            .send({ ...validBody, sessionRetentionDays: 29 })

        expect(response.status).toBe(400)
        expect(response.body.error.code).toBe("BAD_REQUEST")
        expect(response.body.error.details.issues[0].path).toBe("sessionRetentionDays")
        expect(privacy.saveCalls).toHaveLength(0)
    })

    test("previa sem sessao responde 401", async () => {
        const response = await request(app).get(`${PREVIEW_PATH}?sessionDays=90&appointmentDays=365`)

        expect(response.status).toBe(401)
        expect(response.body).toEqual({ error: { code: "UNAUTHORIZED", message: "Authentication required" } })
        expect(retention.countDueCalls).toHaveLength(0)
    })

    test("previa para quem nao e Admin responde 403", async () => {
        const response = await request(app).get(`${PREVIEW_PATH}?sessionDays=90&appointmentDays=365`).set("Cookie", cookieFor(staff))

        expect(response.status).toBe(403)
        expect(response.body).toEqual({ error: { code: "FORBIDDEN", message: "Insufficient permission" } })
        expect(retention.countDueCalls).toHaveLength(0)
    })

    test.each([
        { query: "appointmentDays=365", path: "sessionDays" },
        { query: "sessionDays=90&appointmentDays=89", path: "appointmentDays" },
        { query: "sessionDays=abc&appointmentDays=365", path: "sessionDays" },
    ])(
        "previa com a consulta $query responde 400 com as issues",
        async ({ query, path }) => {
            const response = await request(app).get(`${PREVIEW_PATH}?${query}`).set("Cookie", cookieFor(admin))

            expect(response.status).toBe(400)
            expect(response.body.error.code).toBe("BAD_REQUEST")
            expect(response.body.error.details.issues.map((issue: { path: string }) => issue.path)).toEqual([path])
            expect(retention.countDueCalls).toHaveLength(0)
        },
    )

    test("previa valida devolve as contagens do repositorio com os prazos pedidos e no-store", async () => {
        retention.counts = { sessions: 4, appointments: 2 }
        const before = Date.now()

        const response = await request(app).get(`${PREVIEW_PATH}?sessionDays=90&appointmentDays=365`).set("Cookie", cookieFor(admin))

        expect(response.status).toBe(200)
        expect(response.body).toEqual({ data: { sessions: 4, appointments: 2 } })
        expect(response.headers["cache-control"]).toBe("no-store")
        expect(retention.countDueCalls).toHaveLength(1)
        expect(retention.countDueCalls[0]).toEqual({ now: expect.any(Date), sessionDays: 90, appointmentDays: 365 })
        expect(retention.countDueCalls[0]?.now.getTime()).toBeGreaterThanOrEqual(before)
    })
})
