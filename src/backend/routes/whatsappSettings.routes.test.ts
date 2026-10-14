import request from "supertest"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import app from "../app"
import { authRepository } from "../repositories/auth.repository"
import { whatsappSettingsRepository } from "../repositories/whatsappSettings.repository"
import { MockWhatsAppSettingsRepository } from "../repositories/mock/whatsappSettingsMock.repository"
import { metaGraphClient } from "../clients/metaGraph.client"
import { MockMetaGraphClient } from "../clients/metaGraphMock.client"
import { gatewayClient } from "../clients/gateway.client"
import { PERMISSIONS } from "../types/auth.types"
import { encrypt } from "../utils/crypto.utils"
import { sessionTokens } from "../utils/sessionToken"

vi.mock("../repositories/auth.repository", () => ({
    authRepository: { findActiveById: vi.fn() },
}))

vi.mock("../repositories/whatsappSettings.repository", async () => {
    const { MockWhatsAppSettingsRepository: Repository } = await import("../repositories/mock/whatsappSettingsMock.repository")
    return { whatsappSettingsRepository: new Repository(null) }
})

vi.mock("../clients/metaGraph.client", async (importOriginal) => {
    const { MockMetaGraphClient: Client } = await import("../clients/metaGraphMock.client")
    return { ...(await importOriginal<typeof import("../clients/metaGraph.client")>()), metaGraphClient: new Client() }
})

vi.mock("../clients/gateway.client", async (importOriginal) => ({
    ...(await importOriginal<typeof import("../clients/gateway.client")>()),
    gatewayClient: { notifyConfigChanged: vi.fn(async () => undefined) },
}))

const ORIGIN = "http://localhost:5173"
const NOW = new Date("2026-10-14T13:00:00.000Z")
const SAVED_TOKEN = "EAAG-token-salvo-ficticio-a91F"
const SAVED_SECRET = "segredo-salvo-ficticio-9c2e"
const NEW_TOKEN = "EAAG-token-novo-ficticio-77Zz"
const VERIFY_TOKEN = "3f9a".repeat(16)
const PAUSED_MESSAGE =
    "O atendimento automático do PROCON Jacareí está temporariamente indisponível. Tente novamente mais tarde."

const admin = { id: 1, name: "Admin", email: "admin@exemplo.test", isAdmin: true, permissions: [...PERMISSIONS], sessionVersion: 0 }
const staff = { id: 2, name: "Equipe", email: "equipe@exemplo.test", isAdmin: false, permissions: [...PERMISSIONS], sessionVersion: 0 }

const settings = whatsappSettingsRepository as unknown as MockWhatsAppSettingsRepository
const meta = metaGraphClient as unknown as MockMetaGraphClient

const routes = [
    { method: "get", path: "/api/v1/whatsapp/settings" },
    { method: "post", path: "/api/v1/whatsapp/settings/test" },
    { method: "put", path: "/api/v1/whatsapp/settings" },
    { method: "post", path: "/api/v1/whatsapp/settings/pause" },
    { method: "post", path: "/api/v1/whatsapp/settings/resume" },
] as const

const stateChangingRoutes = routes.filter((route) => route.method !== "get")

function cookieFor(user: { id: number; sessionVersion: number }): string {
    return `proconchat_access=${sessionTokens.signAccessToken({ userId: user.id, sessionVersion: user.sessionVersion })}`
}

function call(method: "get" | "post" | "put", path: string, user = admin) {
    return request(app)[method](path).set("Origin", ORIGIN).set("Cookie", cookieFor(user))
}

function savedView(overrides: Record<string, unknown> = {}) {
    return {
        phoneNumberId: "100000000000001",
        businessAccountId: null,
        accessToken: { configured: true, last4: "a91F" },
        appSecret: { configured: true, last4: "9c2e" },
        verifyToken: VERIFY_TOKEN,
        webhookUrl: null,
        graphApiVersion: "v26.0",
        credentialsValid: null,
        credentialsCheckedAt: null,
        autoReplyPaused: false,
        pausedMessage: PAUSED_MESSAGE,
        updatedBy: null,
        updatedAt: NOW.toISOString(),
        ...overrides,
    }
}

describe("/api/v1/whatsapp/settings", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.useFakeTimers({ toFake: ["Date"] })
        vi.setSystemTime(NOW)
        settings.row = {
            phoneNumberId: "100000000000001",
            businessAccountId: null,
            accessTokenEncrypted: encrypt(SAVED_TOKEN),
            appSecretEncrypted: encrypt(SAVED_SECRET),
            verifyToken: VERIFY_TOKEN,
            autoReplyPaused: false,
            credentialsCheckedAt: null,
            credentialsValid: null,
            updatedBy: null,
            updatedAt: NOW,
        }
        settings.addUser(1, "Admin")
        meta.calls.length = 0
        meta.respondWith({ ok: true, displayPhoneNumber: "+55 12 99999-0000", verifiedName: "PROCON Jacareí" })
        vi.mocked(authRepository.findActiveById).mockImplementation(async (id) => (id === admin.id ? admin : id === staff.id ? staff : null))
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    test.each(routes)("$method $path responde 401 sem cookie valido", async ({ method, path }) => {
        const response = await request(app)[method](path).set("Origin", ORIGIN).send({})

        expect(response.status).toBe(401)
        expect(response.body).toEqual({ error: { code: "UNAUTHORIZED", message: "Authentication required" } })
        expect(response.headers["cache-control"]).toBe("no-store")
    })

    test.each(routes)("$method $path responde 403 para o funcionario com as 8 permissoes", async ({ method, path }) => {
        const response = await call(method, path, staff).send({ phoneNumberId: "100000000000001" })

        expect(response.status).toBe(403)
        expect(response.body).toEqual({ error: { code: "FORBIDDEN", message: "Insufficient permission" } })
        expect(meta.calls).toHaveLength(0)
    })

    test.each(stateChangingRoutes)("$method $path responde 403 INVALID_ORIGIN sem Origin", async ({ method, path }) => {
        const response = await request(app)[method](path).set("Cookie", cookieFor(admin)).send({})

        expect(response.status).toBe(403)
        expect(response.body.error.code).toBe("INVALID_ORIGIN")
    })

    test("GET devolve a leitura ao Admin sem segredos e com no-store", async () => {
        const response = await call("get", "/api/v1/whatsapp/settings")

        expect(response.status).toBe(200)
        expect(response.body).toEqual({ data: savedView() })
        expect(response.headers["cache-control"]).toBe("no-store")
        expect(response.text).not.toContain(SAVED_TOKEN)
        expect(response.text).not.toContain(SAVED_SECRET)
        expect(response.text).not.toContain("v1:")
    })

    test("POST /test devolve o resultado do teste ao Admin", async () => {
        const response = await call("post", "/api/v1/whatsapp/settings/test").send({ phoneNumberId: "100000000000001" })

        expect(response.status).toBe(200)
        expect(response.body).toEqual({
            data: {
                ok: true,
                displayPhoneNumber: "+55 12 99999-0000",
                verifiedName: "PROCON Jacareí",
                checkedAt: NOW.toISOString(),
            },
        })
        expect(response.headers["cache-control"]).toBe("no-store")
    })

    test("POST /test devolve 200 com ok false quando a Meta recusa", async () => {
        meta.respondWith({ ok: false, reason: "INVALID_TOKEN" })

        const response = await call("post", "/api/v1/whatsapp/settings/test").send({ phoneNumberId: "100000000000001", accessToken: NEW_TOKEN })

        expect(response.status).toBe(200)
        expect(response.body).toEqual({ data: { ok: false, reason: "INVALID_TOKEN", checkedAt: NOW.toISOString() } })
    })

    test("PUT salva, devolve a leitura e nao deixa o token enviado em resposta nem em log", async () => {
        const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined)
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)

        const response = await call("put", "/api/v1/whatsapp/settings").send({
            phoneNumberId: "100000000000001",
            businessAccountId: "",
            accessToken: NEW_TOKEN,
        })

        expect(response.status).toBe(200)
        expect(response.body).toEqual({
            data: savedView({
                accessToken: { configured: true, last4: "77Zz" },
                credentialsValid: true,
                credentialsCheckedAt: NOW.toISOString(),
                updatedBy: { id: 1, name: "Admin" },
            }),
        })
        expect(response.headers["cache-control"]).toBe("no-store")
        expect(response.text).not.toContain(NEW_TOKEN)
        const logged = [...logSpy.mock.calls, ...errorSpy.mock.calls].map((args) => args.map(String).join(" ")).join("\n")
        expect(logged).not.toContain(NEW_TOKEN)
        expect(logged).not.toContain(SAVED_SECRET)
        expect(gatewayClient.notifyConfigChanged).toHaveBeenCalledTimes(1)
    })

    test("PUT responde 422 com o motivo e nao grava quando o teste refeito falha", async () => {
        const before = { ...settings.row }
        meta.respondWith({ ok: false, reason: "INVALID_TOKEN" })

        const response = await call("put", "/api/v1/whatsapp/settings").send({ phoneNumberId: "100000000000001", accessToken: NEW_TOKEN })

        expect(response.status).toBe(422)
        expect(response.body).toEqual({ error: { code: "INVALID_TOKEN", message: "WhatsApp connection test failed" } })
        expect(settings.row).toEqual(before)
        expect(gatewayClient.notifyConfigChanged).not.toHaveBeenCalled()
    })

    test.each([
        ["/api/v1/whatsapp/settings/test", "post"],
        ["/api/v1/whatsapp/settings", "put"],
    ] as const)("%s responde 400 sem chamar a Meta quando o corpo e invalido", async (path, method) => {
        const response = await call(method, path).send({ phoneNumberId: "abc", accessToken: NEW_TOKEN })

        expect(response.status).toBe(400)
        expect(response.body).toEqual({
            error: { code: "BAD_REQUEST", message: "phoneNumberId must contain only digits, up to 40" },
        })
        expect(response.text).not.toContain(NEW_TOKEN)
        expect(meta.calls).toHaveLength(0)
    })

    test("POST /pause liga a pausa e devolve a leitura", async () => {
        const response = await call("post", "/api/v1/whatsapp/settings/pause")

        expect(response.status).toBe(200)
        expect(response.body).toEqual({ data: savedView({ autoReplyPaused: true, updatedBy: { id: 1, name: "Admin" } }) })
        expect(response.headers["cache-control"]).toBe("no-store")
        expect(settings.row?.autoReplyPaused).toBe(true)
    })

    test("POST /resume desliga a pausa e devolve a leitura", async () => {
        if (settings.row) {
            settings.row.autoReplyPaused = true
        }

        const response = await call("post", "/api/v1/whatsapp/settings/resume")

        expect(response.status).toBe(200)
        expect(response.body).toEqual({ data: savedView({ autoReplyPaused: false, updatedBy: { id: 1, name: "Admin" } }) })
        expect(settings.row?.autoReplyPaused).toBe(false)
    })
})
