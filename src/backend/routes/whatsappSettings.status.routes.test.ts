import request from "supertest"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import app from "../app"
import { metaGraphClient } from "../clients/metaGraph.client"
import { MockMetaGraphClient } from "../clients/metaGraphMock.client"
import { appointmentRepository } from "../repositories/appointment.repository"
import { authRepository } from "../repositories/auth.repository"
import { OutboundMessageStubRepository } from "../repositories/mock/outboundMessageStub.repository"
import { MockWhatsAppSettingsRepository } from "../repositories/mock/whatsappSettingsMock.repository"
import { outboundMessageRepository } from "../repositories/outboundMessage.repository"
import { whatsappSettingsRepository } from "../repositories/whatsappSettings.repository"
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

vi.mock("../repositories/outboundMessage.repository", async () => {
    const { OutboundMessageStubRepository: Repository } = await import("../repositories/mock/outboundMessageStub.repository")
    return { outboundMessageRepository: new Repository() }
})

vi.mock("../clients/metaGraph.client", async (importOriginal) => {
    const { MockMetaGraphClient: Client } = await import("../clients/metaGraphMock.client")
    return { ...(await importOriginal<typeof import("../clients/metaGraph.client")>()), metaGraphClient: new Client() }
})

vi.mock("../repositories/appointment.repository", async (importOriginal) => {
    const original = await importOriginal<typeof import("../repositories/appointment.repository")>()
    return {
        ...original,
        appointmentRepository: { ...original.appointmentRepository, countNotifiedPhonesBetween: vi.fn(async () => 3) },
    }
})

const NOW = new Date("2026-10-14T13:00:00.000Z")
const SAVED_TOKEN = "EAAG-token-salvo-ficticio-a91F"
const SAVED_SECRET = "segredo-salvo-ficticio-9c2e"
const admin = { id: 1, name: "Admin", email: "admin@exemplo.test", isAdmin: true, permissions: [...PERMISSIONS], sessionVersion: 0 }
const staff = { id: 2, name: "Equipe", email: "equipe@exemplo.test", isAdmin: false, permissions: [...PERMISSIONS], sessionVersion: 0 }
const settings = whatsappSettingsRepository as unknown as MockWhatsAppSettingsRepository
const meta = metaGraphClient as unknown as MockMetaGraphClient
const outbound = outboundMessageRepository as unknown as OutboundMessageStubRepository
const statusRoutes = ["/api/v1/whatsapp/settings/templates", "/api/v1/whatsapp/settings/number-status"]

function get(path: string, user = admin) {
    return request(app)
        .get(path)
        .set("Cookie", `proconchat_access=${sessionTokens.signAccessToken({ userId: user.id, sessionVersion: user.sessionVersion })}`)
}

describe("/api/v1/whatsapp/settings: modelos e estado do número", () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ["Date"] })
        vi.setSystemTime(NOW)
        settings.row = {
            phoneNumberId: "100000000000001",
            businessAccountId: "200000000000002",
            accessTokenEncrypted: encrypt(SAVED_TOKEN),
            appSecretEncrypted: encrypt(SAVED_SECRET),
            verifyToken: "3f9a".repeat(16),
            autoReplyPaused: false,
            credentialsCheckedAt: null,
            credentialsValid: null,
            displayPhoneNumber: null,
            verifiedName: null,
            accessTokenLifetime: { kind: "UNKNOWN", expiresAt: null },
            lastWebhookEventAt: null,
            updatedBy: null,
            updatedAt: NOW,
        }
        meta.templateCalls.length = 0
        meta.phoneStatusCalls.length = 0
        meta.respondToTemplatesWith({
            ok: true,
            templates: [
                { kind: "CANCELLATION", name: "aviso_cancelamento", languageCode: "pt_BR", status: "PENDING", metaStatus: "PENDING" },
                { kind: "REMINDER", name: "lembrete_atendimento", languageCode: "pt_BR", status: "NOT_FOUND", metaStatus: null },
            ],
        })
        meta.respondToPhoneStatusWith({ ok: true, qualityRating: "HIGH", tier: "TIER_250", dailyLimit: 250 })
        vi.mocked(authRepository.findActiveById).mockImplementation(async (id) => (id === admin.id ? admin : id === staff.id ? staff : null))
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    test.each(statusRoutes)("GET %s responde 403 para quem não é Admin e não chama a Meta", async (path) => {
        const response = await get(path, staff)

        expect(response.status).toBe(403)
        expect(response.body).toEqual({ error: { code: "FORBIDDEN", message: "Insufficient permission" } })
        expect(response.headers["cache-control"]).toBe("no-store")
        expect([...meta.templateCalls, ...meta.phoneStatusCalls]).toEqual([])
    })

    test("GET /templates responde 200 ao Admin com no-store e o status dos dois modelos, sem token nem App Secret", async () => {
        const response = await get("/api/v1/whatsapp/settings/templates")

        expect(response.status).toBe(200)
        expect(response.headers["cache-control"]).toBe("no-store")
        expect(response.body).toEqual({
            data: {
                checkedAt: NOW.toISOString(),
                templates: [
                    { kind: "CANCELLATION", name: "aviso_cancelamento", languageCode: "pt_BR", status: "PENDING", metaStatus: "PENDING" },
                    { kind: "REMINDER", name: "lembrete_atendimento", languageCode: "pt_BR", status: "NOT_FOUND", metaStatus: null },
                ],
            },
        })
        expect(JSON.stringify(response.body)).not.toContain(SAVED_TOKEN)
        expect(JSON.stringify(response.body)).not.toContain(SAVED_SECRET)
    })

    test("GET /number-status responde 200 ao Admin com no-store, a qualidade, o limite e o uso, sem token nem App Secret", async () => {
        const response = await get("/api/v1/whatsapp/settings/number-status")

        expect(response.status).toBe(200)
        expect(response.headers["cache-control"]).toBe("no-store")
        expect(response.body).toEqual({
            data: {
                checkedAt: NOW.toISOString(),
                qualityRating: "HIGH",
                messagingLimit: { tier: "TIER_250", dailyLimit: 250, usedLast24h: 3 },
            },
        })
        expect(vi.mocked(appointmentRepository.countNotifiedPhonesBetween)).toHaveBeenCalledWith(
            new Date("2026-10-13T13:00:00.000Z"),
            NOW,
        )
        expect(JSON.stringify(response.body)).not.toContain(SAVED_TOKEN)
        expect(JSON.stringify(response.body)).not.toContain(SAVED_SECRET)
    })

    test.each([
        { path: "/api/v1/whatsapp/settings/templates", reason: "INVALID_TOKEN" as const },
        { path: "/api/v1/whatsapp/settings/templates", reason: "META_UNAVAILABLE" as const },
        { path: "/api/v1/whatsapp/settings/number-status", reason: "INVALID_TOKEN" as const },
        { path: "/api/v1/whatsapp/settings/number-status", reason: "META_UNAVAILABLE" as const },
    ])("GET $path responde 422 $reason quando a Meta recusa", async ({ path, reason }) => {
        meta.respondToTemplatesWith({ ok: false, reason })
        meta.respondToPhoneStatusWith({ ok: false, reason })

        const response = await get(path)

        expect(response.status).toBe(422)
        expect(response.body).toEqual({ error: { code: reason, message: "WhatsApp connection test failed" } })
    })

    test.each(statusRoutes)("GET %s responde 409 WHATSAPP_NOT_CONFIGURED sem o token salvo", async (path) => {
        settings.row = settings.row ? { ...settings.row, accessTokenEncrypted: null } : null

        const response = await get(path)

        expect(response.status).toBe(409)
        expect(response.body).toEqual({
            error: { code: "WHATSAPP_NOT_CONFIGURED", message: "A integração com o WhatsApp não está configurada" },
        })
    })

    test("GET /delivery-failures responde 200 ao Admin com no-store e as falhas das últimas 24h, sem o id da mensagem na Meta", async () => {
        outbound.failurePage = {
            count: 1,
            items: [{ id: "9", kind: "CANCELLATION", errorCode: null, failedAt: new Date("2026-10-14T12:00:00.000Z"), appointmentId: "41" }],
        }

        const response = await get("/api/v1/whatsapp/settings/delivery-failures")

        expect(response.status).toBe(200)
        expect(response.headers["cache-control"]).toBe("no-store")
        expect(response.body).toEqual({
            data: {
                since: "2026-10-13T13:00:00.000Z",
                count: 1,
                items: [{ id: "9", kind: "CANCELLATION", errorCode: null, failedAt: "2026-10-14T12:00:00.000Z", appointmentId: "41" }],
            },
        })
        expect(JSON.stringify(response.body)).not.toContain("provider_message_id")
        expect(JSON.stringify(response.body)).not.toContain("provider_message_hash")
        expect(JSON.stringify(response.body)).not.toContain("providerMessageId")
    })

    test("GET /delivery-failures responde 401 sem sessão e 403 para quem não é Admin, sem consultar as falhas", async () => {
        outbound.failureQueries.length = 0

        const anonymous = await request(app).get("/api/v1/whatsapp/settings/delivery-failures")
        const forbidden = await get("/api/v1/whatsapp/settings/delivery-failures", staff)

        expect(anonymous.status).toBe(401)
        expect(anonymous.body).toEqual({ error: { code: "UNAUTHORIZED", message: "Authentication required" } })
        expect(forbidden.status).toBe(403)
        expect(forbidden.body).toEqual({ error: { code: "FORBIDDEN", message: "Insufficient permission" } })
        expect(outbound.failureQueries).toEqual([])
    })
})

