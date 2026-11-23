import { describe, expect, it, vi } from "vitest"
import { MockMetaGraphClient } from "../clients/metaGraphMock.client"
import { AuditLogStubRepository } from "../repositories/mock/auditLogStub.repository"
import { OutboundMessageStubRepository } from "../repositories/mock/outboundMessageStub.repository"
import { MockWhatsAppSettingsRepository } from "../repositories/mock/whatsappSettingsMock.repository"
import { WhatsAppSettingsRow } from "../types/whatsappSettings.types"
import { decrypt, encrypt } from "../utils/crypto.utils"
import { createWhatsAppSettingsService } from "./whatsappSettings.service"

const NOW = new Date("2026-10-14T13:00:00.000Z")
const DAY_MS = 24 * 60 * 60 * 1000
const UNKNOWN_LIFETIME = { kind: "UNKNOWN", expiresAt: null } as const

function expiringAt(ms: number) {
    return { kind: "EXPIRING", expiresAt: new Date(ms).toISOString() } as const
}
const SAVED_TOKEN = "EAAG-token-salvo-ficticio-a91F"
const SAVED_SECRET = "segredo-salvo-ficticio-9c2e"

function savedRow(overrides: Partial<WhatsAppSettingsRow> = {}): Partial<WhatsAppSettingsRow> {
    return {
        phoneNumberId: "100000000000001",
        businessAccountId: "200000000000002",
        accessTokenEncrypted: encrypt(SAVED_TOKEN),
        appSecretEncrypted: encrypt(SAVED_SECRET),
        verifyToken: "3f9a".repeat(16),
        updatedAt: NOW,
        ...overrides,
    }
}

function setup(row: Partial<WhatsAppSettingsRow> = savedRow(), notifiedPhones = 0) {
    const settings = new MockWhatsAppSettingsRepository(row, () => NOW)
    const meta = new MockMetaGraphClient()
    const usage = { countNotifiedPhonesBetween: vi.fn(async () => notifiedPhones) }
    const outbound = new OutboundMessageStubRepository()
    const service = createWhatsAppSettingsService({
        settings,
        outbound,
        audit: new AuditLogStubRepository(),
        meta,
        gateway: { notifyConfigChanged: vi.fn(async () => undefined) },
        usage,
        encrypt,
        decrypt,
        env: { WHATSAPP_GRAPH_API_VERSION: "v26.0" },
        now: () => NOW,
        logger: { log: vi.fn() },
    })
    return { meta, usage, outbound, service }
}

describe("whatsappSettings.service: modelos e estado do número", () => {
    it.each([
        { label: "sem o ID da conta", row: savedRow({ businessAccountId: null }) },
        { label: "sem o token", row: savedRow({ accessTokenEncrypted: null }) },
        { label: "sem o App Secret", row: savedRow({ appSecretEncrypted: null }) },
    ])("getTemplatesStatus recusa com WHATSAPP_NOT_CONFIGURED $label e não chama a Meta", async ({ row }) => {
        const { meta, service } = setup(row)

        await expect(service.getTemplatesStatus()).rejects.toMatchObject({ statusCode: 409, code: "WHATSAPP_NOT_CONFIGURED" })

        expect(meta.templateCalls).toEqual([])
    })

    it.each([
        { label: "sem o ID do número", row: savedRow({ phoneNumberId: null }) },
        { label: "sem o token", row: savedRow({ accessTokenEncrypted: null }) },
        { label: "sem o App Secret", row: savedRow({ appSecretEncrypted: null }) },
    ])("getNumberStatus recusa com WHATSAPP_NOT_CONFIGURED $label e não chama a Meta", async ({ row }) => {
        const { meta, service } = setup(row)

        await expect(service.getNumberStatus()).rejects.toMatchObject({ statusCode: 409, code: "WHATSAPP_NOT_CONFIGURED" })

        expect(meta.phoneStatusCalls).toEqual([])
    })

    it("getNumberStatus funciona sem o ID da conta", async () => {
        const { service } = setup(savedRow({ businessAccountId: null }))

        await expect(service.getNumberStatus()).resolves.toMatchObject({ qualityRating: "HIGH" })
    })

    it("getTemplatesStatus consulta os dois modelos com as credenciais salvas e devolve o status de cada um", async () => {
        const { meta, service } = setup()
        const templates = [
            { kind: "CANCELLATION" as const, name: "aviso_cancelamento", languageCode: "pt_BR", status: "APPROVED" as const, metaStatus: "APPROVED" },
            { kind: "REMINDER" as const, name: "lembrete_atendimento", languageCode: "pt_BR", status: "NOT_FOUND" as const, metaStatus: null },
        ]
        meta.respondToTemplatesWith({ ok: true, templates })

        const view = await service.getTemplatesStatus()

        expect(view).toEqual({ checkedAt: NOW.toISOString(), templates })
        expect(meta.templateCalls).toEqual([
            {
                input: { accessToken: SAVED_TOKEN, appSecret: SAVED_SECRET, graphApiVersion: "v26.0", businessAccountId: "200000000000002" },
                templates: [
                    { kind: "CANCELLATION", name: "aviso_cancelamento", languageCode: "pt_BR" },
                    { kind: "REMINDER", name: "lembrete_atendimento", languageCode: "pt_BR" },
                ],
            },
        ])
    })

    it("getNumberStatus devolve a qualidade, o limite e os telefones avisados nas últimas 24h", async () => {
        const { meta, usage, service } = setup(savedRow(), 7)
        meta.respondToPhoneStatusWith({ ok: true, qualityRating: "MEDIUM", tier: "TIER_250", dailyLimit: 250 })

        const view = await service.getNumberStatus()

        expect(view).toEqual({
            checkedAt: NOW.toISOString(),
            qualityRating: "MEDIUM",
            messagingLimit: { tier: "TIER_250", dailyLimit: 250, usedLast24h: 7 },
        })
        expect(meta.phoneStatusCalls).toEqual([
            { accessToken: SAVED_TOKEN, appSecret: SAVED_SECRET, graphApiVersion: "v26.0", phoneNumberId: "100000000000001" },
        ])
        expect(usage.countNotifiedPhonesBetween).toHaveBeenCalledWith(new Date("2026-10-13T13:00:00.000Z"), NOW)
    })

    it.each([
        { method: "getTemplatesStatus" as const },
        { method: "getNumberStatus" as const },
    ])("$method transforma a recusa da Meta em WhatsAppConnectionError 422 com o motivo", async ({ method }) => {
        const { meta, service } = setup()
        meta.respondToTemplatesWith({ ok: false, reason: "INVALID_TOKEN" })
        meta.respondToPhoneStatusWith({ ok: false, reason: "INVALID_TOKEN" })

        await expect(service[method]()).rejects.toMatchObject({ statusCode: 422, code: "INVALID_TOKEN" })
    })

    it.each([
        { label: "exatamente 24h atrás não está parado", at: new Date(NOW.getTime() - DAY_MS), expected: { lastEventAt: new Date(NOW.getTime() - DAY_MS).toISOString(), stale: false } },
        { label: "24h e 1 ms atrás está parado", at: new Date(NOW.getTime() - DAY_MS - 1), expected: { lastEventAt: new Date(NOW.getTime() - DAY_MS - 1).toISOString(), stale: true } },
        { label: "sem nenhum evento está parado", at: null, expected: { lastEventAt: null, stale: true } },
    ])("getView informa o último evento do webhook: $label", async ({ at, expected }) => {
        const { service } = setup(savedRow({ lastWebhookEventAt: at }))

        const view = await service.getView()

        expect(view.webhook).toEqual(expected)
    })

    it.each([
        { label: "nunca verificadas", valid: null, lifetime: UNKNOWN_LIFETIME, expected: "NOT_CHECKED" },
        { label: "recusadas", valid: false, lifetime: UNKNOWN_LIFETIME, expected: "INVALID" },
        { label: "token que vence agora", valid: true, lifetime: expiringAt(NOW.getTime()), expected: "EXPIRED" },
        { label: "token que vence 1 ms depois", valid: true, lifetime: expiringAt(NOW.getTime() + 1), expected: "VALID" },
        { label: "token permanente", valid: true, lifetime: { kind: "PERMANENT", expiresAt: null } as const, expected: "VALID" },
        { label: "token de tipo desconhecido", valid: true, lifetime: UNKNOWN_LIFETIME, expected: "VALID" },
    ])("getView informa o estado das credenciais: $label dá $expected", async ({ valid, lifetime, expected }) => {
        const { service } = setup(savedRow({ credentialsValid: valid, accessTokenLifetime: lifetime }))

        const view = await service.getView()

        expect(view.credentialsStatus).toBe(expected)
    })

    it("getDeliveryFailures pede as 50 falhas mais recentes das últimas 24h e devolve as datas em ISO", async () => {
        const { outbound, service } = setup()
        outbound.failurePage = {
            count: 2,
            items: [
                { id: "9", kind: "CANCELLATION", errorCode: null, failedAt: new Date("2026-10-14T12:00:00.000Z"), appointmentId: "41" },
                { id: "8", kind: "REPLY", errorCode: "131047", failedAt: new Date("2026-10-14T11:00:00.000Z"), appointmentId: null },
            ],
        }

        const result = await service.getDeliveryFailures()

        expect(outbound.failureQueries).toEqual([{ since: new Date(NOW.getTime() - DAY_MS), limit: 50 }])
        expect(result).toEqual({
            since: "2026-10-13T13:00:00.000Z",
            count: 2,
            items: [
                { id: "9", kind: "CANCELLATION", errorCode: null, failedAt: "2026-10-14T12:00:00.000Z", appointmentId: "41" },
                { id: "8", kind: "REPLY", errorCode: "131047", failedAt: "2026-10-14T11:00:00.000Z", appointmentId: null },
            ],
        })
    })
})

