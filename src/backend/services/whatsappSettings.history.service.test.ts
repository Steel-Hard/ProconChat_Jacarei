import { describe, expect, it, vi } from "vitest"
import { MockMetaGraphClient } from "../clients/metaGraphMock.client"
import { AuditLogStubRepository } from "../repositories/mock/auditLogStub.repository"
import { OutboundMessageStubRepository } from "../repositories/mock/outboundMessageStub.repository"
import { MockWhatsAppSettingsRepository } from "../repositories/mock/whatsappSettingsMock.repository"
import { WhatsAppSettingsRow } from "../types/whatsappSettings.types"
import { decrypt, encrypt } from "../utils/crypto.utils"
import { createWhatsAppSettingsService } from "./whatsappSettings.service"

const NOW = new Date("2026-10-14T13:00:00.000Z")
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

function setup(row: Partial<WhatsAppSettingsRow> = savedRow()) {
    const settings = new MockWhatsAppSettingsRepository(row, () => NOW)
    const audit = new AuditLogStubRepository()
    const service = createWhatsAppSettingsService({
        settings,
        audit,
        outbound: new OutboundMessageStubRepository(),
        meta: new MockMetaGraphClient(),
        gateway: { notifyConfigChanged: vi.fn(async () => undefined) },
        usage: { countNotifiedPhonesBetween: vi.fn(async () => 0) },
        encrypt,
        decrypt,
        env: { WHATSAPP_GRAPH_API_VERSION: "v26.0" },
        now: () => NOW,
        logger: { log: vi.fn() },
    })
    return { settings, audit, service }
}

describe("whatsappSettings.service: histórico de alterações", () => {
    it("save que troca o ID da conta e o token grava no histórico só os nomes desses dois campos", async () => {
        const { settings, service } = setup()

        await service.save({ phoneNumberId: "100000000000001", businessAccountId: "200000000000009", accessToken: "EAAG-token-novo-ficticio-77Zz" }, 1)

        expect(settings.saveInputs.map((input) => input.auditFields)).toEqual([["businessAccountId", "accessToken"]])
    })

    it("save sem mudança nos IDs e sem segredo novo grava o histórico com a lista vazia", async () => {
        const { settings, service } = setup()

        await service.save({ phoneNumberId: "100000000000001", businessAccountId: "200000000000002" }, 1)

        expect(settings.saveInputs.map((input) => input.auditFields)).toEqual([[]])
    })

    it("save que troca os quatro campos grava os nomes na ordem fixa", async () => {
        const { settings, service } = setup()

        await service.save(
            {
                appSecret: "segredo-novo-ficticio-1d4f",
                accessToken: "EAAG-token-novo-ficticio-77Zz",
                businessAccountId: "200000000000009",
                phoneNumberId: "100000000000009",
            },
            1,
        )

        expect(settings.saveInputs.map((input) => input.auditFields)).toEqual([
            ["phoneNumberId", "businessAccountId", "accessToken", "appSecret"],
        ])
    })

    it("getHistory pede as 50 alterações mais recentes do WhatsApp e devolve as datas em ISO", async () => {
        const { audit, service } = setup()
        audit.entries = [
            {
                id: "7",
                action: "credentials_saved",
                fields: ["accessToken"],
                actor: { id: 1, name: "Admin" },
                createdAt: new Date("2026-10-14T12:30:00.000Z"),
            },
            { id: "6", action: "auto_reply_paused", fields: [], actor: null, createdAt: new Date("2026-10-14T12:00:00.000Z") },
        ]

        const history = await service.getHistory()

        expect(audit.listCalls).toEqual([{ area: "whatsapp", limit: 50 }])
        expect(history).toEqual({
            items: [
                {
                    id: "7",
                    action: "credentials_saved",
                    fields: ["accessToken"],
                    actor: { id: 1, name: "Admin" },
                    createdAt: "2026-10-14T12:30:00.000Z",
                },
                { id: "6", action: "auto_reply_paused", fields: [], actor: null, createdAt: "2026-10-14T12:00:00.000Z" },
            ],
        })
    })
})
