import { beforeEach, describe, expect, it, vi } from "vitest"
import { createWhatsAppSettingsService } from "./whatsappSettings.service"
import { MENSAGEM_ATENDIMENTO_PAUSADO } from "./messageFormatter.service"
import { MockWhatsAppSettingsRepository } from "../repositories/mock/whatsappSettingsMock.repository"
import { MockMetaGraphClient } from "../clients/metaGraphMock.client"
import { decrypt, encrypt } from "../utils/crypto.utils"
import { WhatsAppSettingsRow } from "../types/whatsappSettings.types"

const NOW = new Date("2026-10-14T13:00:00.000Z")
const SAVED_TOKEN = "EAAG-token-salvo-ficticio-a91F"
const SAVED_SECRET = "segredo-salvo-ficticio-9c2e"
const NEW_TOKEN = "EAAG-token-novo-ficticio-77Zz"
const UNREADABLE = "v1:AAAAAAAAAAAAAAAA:AAAAAAAAAAAAAAAAAAAAAA==:AAAA"
const VERIFY_TOKEN = "3f9a".repeat(16)

function savedRow(overrides: Partial<WhatsAppSettingsRow> = {}): Partial<WhatsAppSettingsRow> {
    return {
        phoneNumberId: "100000000000001",
        businessAccountId: null,
        accessTokenEncrypted: encrypt(SAVED_TOKEN),
        appSecretEncrypted: encrypt(SAVED_SECRET),
        verifyToken: VERIFY_TOKEN,
        updatedAt: NOW,
        ...overrides,
    }
}

function setup(row: Partial<WhatsAppSettingsRow> | null = savedRow(), env: Record<string, string | undefined> = {}) {
    const settings = new MockWhatsAppSettingsRepository(row, () => NOW)
    settings.addUser(1, "Admin")
    const meta = new MockMetaGraphClient()
    const gateway = { notifyConfigChanged: vi.fn(async () => undefined) }
    const logger = { log: vi.fn() }
    const service = createWhatsAppSettingsService({
        settings,
        meta,
        gateway,
        encrypt,
        decrypt,
        env: { WHATSAPP_GRAPH_API_VERSION: "v26.0", ...env },
        now: () => NOW,
        logger,
        generateVerifyToken: () => "b".repeat(64),
    })
    return { settings, meta, gateway, logger, service }
}

function serialized(value: unknown): string {
    return JSON.stringify(value)
}

describe("whatsappSettings service", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe("getView", () => {
        it("devolve a leitura com os 4 ultimos caracteres dos segredos longos e sem o segredo nem o cifrado", async () => {
            const { service, settings } = setup(savedRow({ updatedBy: { id: 1, name: "Admin" } }), {
                PUBLIC_BASE_URL: "https://exemplo.sslip.io",
            })

            const view = await service.getView()

            expect(view).toEqual({
                phoneNumberId: "100000000000001",
                businessAccountId: null,
                accessToken: { configured: true, last4: "a91F" },
                appSecret: { configured: true, last4: "9c2e" },
                verifyToken: VERIFY_TOKEN,
                webhookUrl: "https://exemplo.sslip.io/webhooks/whatsapp",
                graphApiVersion: "v26.0",
                credentialsValid: null,
                credentialsCheckedAt: null,
                autoReplyPaused: false,
                pausedMessage: MENSAGEM_ATENDIMENTO_PAUSADO,
                updatedBy: { id: 1, name: "Admin" },
                updatedAt: "2026-10-14T13:00:00.000Z",
            })
            expect(serialized(view)).not.toContain(SAVED_TOKEN)
            expect(serialized(view)).not.toContain(SAVED_SECRET)
            expect(serialized(view)).not.toContain(settings.row?.accessTokenEncrypted as string)
            expect(serialized(view)).not.toContain("v1:")
        })

        it("devolve last4 null para segredo de 8 caracteres ou menos", async () => {
            const { service } = setup(savedRow({ appSecretEncrypted: encrypt("12345678") }))

            const view = await service.getView()

            expect(view.appSecret).toEqual({ configured: true, last4: null })
        })

        it("devolve configured true e last4 null para segredo ilegivel e loga so o campo", async () => {
            const { service, logger } = setup(savedRow({ accessTokenEncrypted: UNREADABLE }))

            const view = await service.getView()

            expect(view.accessToken).toEqual({ configured: true, last4: null })
            expect(logger.log).toHaveBeenCalledWith(
                JSON.stringify({ event: "whatsapp_settings_decrypt_failed", field: "accessToken" }),
            )
            expect(serialized(logger.log.mock.calls)).not.toContain(UNREADABLE)
        })

        it("devolve webhookUrl null sem PUBLIC_BASE_URL e usa a versao padrao", async () => {
            const { service } = setup(savedRow(), { PUBLIC_BASE_URL: "", WHATSAPP_GRAPH_API_VERSION: undefined })

            const view = await service.getView()

            expect(view.webhookUrl).toBeNull()
            expect(view.graphApiVersion).toBe("v26.0")
        })

        it("cria a linha com um verify_token gerado quando a tabela esta vazia", async () => {
            const { service, settings } = setup(null)

            const view = await service.getView()

            expect(settings.row?.verifyToken).toBe("b".repeat(64))
            expect(view).toMatchObject({
                phoneNumberId: null,
                businessAccountId: null,
                accessToken: { configured: false, last4: null },
                appSecret: { configured: false, last4: null },
                verifyToken: "b".repeat(64),
                updatedBy: null,
            })
        })
    })

    describe("testConnection", () => {
        it("usa os segredos salvos, decifrados, quando nao sao enviados", async () => {
            const { service, meta } = setup()

            const result = await service.testConnection({ phoneNumberId: "100000000000001", accessToken: null })

            expect(result).toEqual({
                ok: true,
                displayPhoneNumber: "+55 12 99999-0000",
                verifiedName: "PROCON Jacareí",
                checkedAt: "2026-10-14T13:00:00.000Z",
            })
            expect(meta.calls).toEqual([
                {
                    phoneNumberId: "100000000000001",
                    businessAccountId: null,
                    accessToken: SAVED_TOKEN,
                    appSecret: SAVED_SECRET,
                    graphApiVersion: "v26.0",
                },
            ])
        })

        it.each([undefined, null, "", "   "])("aceita businessAccountId %s como ausente", async (businessAccountId) => {
            const { service, meta } = setup()

            await service.testConnection({ phoneNumberId: "100000000000001", businessAccountId })

            expect(meta.calls[0]?.businessAccountId).toBeNull()
        })

        it("grava credentials_valid true no teste dos valores salvos sem mudar quem alterou", async () => {
            const { service, settings } = setup()

            await service.testConnection({ phoneNumberId: "100000000000001" })

            expect(settings.credentialChecks).toEqual([true])
            expect(settings.row?.updatedBy).toBeNull()
            expect(settings.saveCalls).toBe(0)
        })

        it.each(["INVALID_TOKEN", "INVALID_APP_SECRET", "PHONE_NUMBER_NOT_FOUND", "BUSINESS_ACCOUNT_NOT_FOUND", "PHONE_NOT_IN_ACCOUNT", "MISSING_PERMISSION"] as const)(
            "grava credentials_valid false no teste dos valores salvos que falha com %s",
            async (reason) => {
                const { service, settings, meta } = setup()
                meta.respondWith({ ok: false, reason })

                const result = await service.testConnection({ phoneNumberId: "100000000000001" })

                expect(result).toEqual({ ok: false, reason, checkedAt: "2026-10-14T13:00:00.000Z" })
                expect(settings.credentialChecks).toEqual([false])
            },
        )

        it.each(["META_UNAVAILABLE", "META_ERROR"] as const)("nao grava nada quando o teste dos valores salvos da %s", async (reason) => {
            const { service, settings, meta } = setup()
            meta.respondWith({ ok: false, reason })

            await service.testConnection({ phoneNumberId: "100000000000001" })

            expect(settings.credentialChecks).toEqual([])
        })

        it.each([
            { phoneNumberId: "100000000000009" },
            { phoneNumberId: "100000000000001", businessAccountId: "200000000000002" },
            { phoneNumberId: "100000000000001", accessToken: NEW_TOKEN },
            { phoneNumberId: "100000000000001", appSecret: "outro-segredo-ficticio" },
        ])("nao grava nada no teste de valores novos (%o)", async (body) => {
            const { service, settings, meta } = setup()

            await service.testConnection(body)

            expect(meta.calls).toHaveLength(1)
            expect(settings.credentialChecks).toEqual([])
            expect(settings.saveCalls).toBe(0)
        })

        it.each([
            ["corpo que nao e objeto", "texto"],
            ["phoneNumberId ausente", {}],
            ["phoneNumberId nao numerico", { phoneNumberId: "abc" }],
            ["phoneNumberId com mais de 40 digitos", { phoneNumberId: "1".repeat(41) }],
            ["businessAccountId nao numerico", { phoneNumberId: "100000000000001", businessAccountId: "conta" }],
            ["businessAccountId que nao e texto", { phoneNumberId: "100000000000001", businessAccountId: 200 }],
            ["accessToken vazio", { phoneNumberId: "100000000000001", accessToken: "" }],
            ["accessToken com espaco", { phoneNumberId: "100000000000001", accessToken: "token com espaco" }],
            ["accessToken longo demais", { phoneNumberId: "100000000000001", accessToken: "a".repeat(2049) }],
            ["appSecret longo demais", { phoneNumberId: "100000000000001", appSecret: "a".repeat(257) }],
        ])("responde 400 sem chamar a Meta para %s", async (_label, body) => {
            const { service, meta } = setup()

            await expect(service.testConnection(body)).rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" })
            expect(meta.calls).toHaveLength(0)
        })

        it.each([
            ["accessToken", savedRow({ accessTokenEncrypted: null })],
            ["appSecret", savedRow({ appSecretEncrypted: null })],
            ["accessToken", savedRow({ accessTokenEncrypted: UNREADABLE })],
        ])("responde 400 pedindo %s quando ele nao e enviado e nao ha valor salvo legivel", async (field, row) => {
            const { service, meta } = setup(row)

            await expect(service.testConnection({ phoneNumberId: "100000000000001" })).rejects.toMatchObject({
                statusCode: 400,
                message: `${field} is required`,
            })
            expect(meta.calls).toHaveLength(0)
        })
    })

    describe("save", () => {
        it("grava os IDs, cifra so o segredo substituido, mantem o outro cifrado e avisa o gateway", async () => {
            const { service, settings, gateway } = setup()
            const savedSecretEncrypted = settings.row?.appSecretEncrypted

            const view = await service.save(
                { phoneNumberId: "100000000000009", businessAccountId: "200000000000002", accessToken: NEW_TOKEN },
                1,
            )

            expect(settings.row?.phoneNumberId).toBe("100000000000009")
            expect(settings.row?.businessAccountId).toBe("200000000000002")
            expect(settings.row?.accessTokenEncrypted).toMatch(/^v1:/)
            expect(decrypt(settings.row?.accessTokenEncrypted as string)).toBe(NEW_TOKEN)
            expect(settings.row?.appSecretEncrypted).toBe(savedSecretEncrypted)
            expect(settings.row?.credentialsValid).toBe(true)
            expect(view).toMatchObject({
                phoneNumberId: "100000000000009",
                accessToken: { configured: true, last4: "77Zz" },
                credentialsValid: true,
                credentialsCheckedAt: "2026-10-14T13:00:00.000Z",
                updatedBy: { id: 1, name: "Admin" },
            })
            expect(serialized(view)).not.toContain(NEW_TOKEN)
            expect(gateway.notifyConfigChanged).toHaveBeenCalledTimes(1)
        })

        it("refaz o teste com os valores efetivos antes de gravar", async () => {
            const { service, meta } = setup()

            await service.save({ phoneNumberId: "100000000000001", appSecret: "novo-segredo-ficticio" }, 1)

            expect(meta.calls).toEqual([
                {
                    phoneNumberId: "100000000000001",
                    businessAccountId: null,
                    accessToken: SAVED_TOKEN,
                    appSecret: "novo-segredo-ficticio",
                    graphApiVersion: "v26.0",
                },
            ])
        })

        it("lanca 422 com o motivo e nao grava nem avisa o gateway quando o teste falha", async () => {
            const { service, settings, meta, gateway } = setup()
            const before = { ...settings.row }
            meta.respondWith({ ok: false, reason: "INVALID_TOKEN" })

            await expect(service.save({ phoneNumberId: "100000000000001", accessToken: NEW_TOKEN }, 1)).rejects.toMatchObject({
                statusCode: 422,
                code: "INVALID_TOKEN",
                message: "WhatsApp connection test failed",
            })
            expect(settings.saveCalls).toBe(0)
            expect(settings.credentialChecks).toEqual([])
            expect(settings.row).toEqual(before)
            expect(gateway.notifyConfigChanged).not.toHaveBeenCalled()
        })

        it("responde 200 mesmo quando o aviso ao gateway falha", async () => {
            const { service, gateway } = setup()
            gateway.notifyConfigChanged.mockRejectedValue(new Error("gateway fora"))

            const view = await service.save({ phoneNumberId: "100000000000001" }, 1)

            expect(view.credentialsValid).toBe(true)
        })

        it("responde 400 sem chamar a Meta quando o corpo e invalido", async () => {
            const { service, meta, settings } = setup()

            await expect(service.save({ phoneNumberId: "abc" }, 1)).rejects.toMatchObject({ statusCode: 400 })
            expect(meta.calls).toHaveLength(0)
            expect(settings.saveCalls).toBe(0)
        })
    })

    describe("pause e resume", () => {
        it("pausar grava auto_reply_paused e quem alterou", async () => {
            const { service, settings, gateway } = setup()

            const view = await service.pause(1)

            expect(settings.row?.autoReplyPaused).toBe(true)
            expect(view).toMatchObject({ autoReplyPaused: true, updatedBy: { id: 1, name: "Admin" } })
            expect(gateway.notifyConfigChanged).not.toHaveBeenCalled()
        })

        it("retomar grava auto_reply_paused false e quem alterou, criando a linha se faltar", async () => {
            const { service, settings } = setup(null)

            const view = await service.resume(1)

            expect(settings.row?.autoReplyPaused).toBe(false)
            expect(view).toMatchObject({ autoReplyPaused: false, updatedBy: { id: 1, name: "Admin" } })
        })

        it("isAutoReplyPaused le o estado do repositorio", async () => {
            const { service } = setup(savedRow({ autoReplyPaused: true }))

            expect(await service.isAutoReplyPaused()).toBe(true)
        })
    })

    describe("getInternalConfig", () => {
        it("devolve a configuracao decifrada para o gateway", async () => {
            const { service } = setup(savedRow(), { WHATSAPP_GRAPH_API_VERSION: "v25.0" })

            const config = await service.getInternalConfig()

            expect(config).toEqual({
                phoneNumberId: "100000000000001",
                accessToken: SAVED_TOKEN,
                appSecret: SAVED_SECRET,
                verifyToken: VERIFY_TOKEN,
                graphApiVersion: "v25.0",
            })
        })

        it("devolve null nos segredos nao configurados", async () => {
            const { service } = setup(savedRow({ phoneNumberId: null, accessTokenEncrypted: null, appSecretEncrypted: null }))

            const config = await service.getInternalConfig()

            expect(config).toEqual({
                phoneNumberId: null,
                accessToken: null,
                appSecret: null,
                verifyToken: VERIFY_TOKEN,
                graphApiVersion: "v26.0",
            })
        })

        it("lanca erro generico sem criar a linha quando a configuracao nao existe", async () => {
            const { service, settings } = setup(null)

            const error = await service.getInternalConfig().catch((caught: unknown) => caught)

            expect(error).toMatchObject({ statusCode: 500, code: "INTERNAL_SERVER_ERROR", message: "Internal Server Error" })
            expect(settings.row).toBeNull()
        })

        it("lanca erro generico sem o valor quando um segredo nao decifra", async () => {
            const { service } = setup(savedRow({ appSecretEncrypted: UNREADABLE }))

            const error = await service.getInternalConfig().catch((caught: unknown) => caught)

            expect(error).toMatchObject({ statusCode: 500, code: "INTERNAL_SERVER_ERROR", message: "Internal Server Error" })
            expect(serialized(error)).not.toContain(UNREADABLE)
        })
    })
})
