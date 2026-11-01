import { beforeEach, describe, expect, test } from "vitest"
import { OutboundMessageStubRepository } from "../repositories/mock/outboundMessageStub.repository"
import { MockWhatsAppSettingsRepository } from "../repositories/mock/whatsappSettingsMock.repository"
import BadRequestError from "../errors/BadRequestError"
import { createWhatsAppEventsService } from "./whatsappEvents.service"

const NOW = new Date("2031-03-10T12:00:00.000Z")
const VALID = { providerMessageId: "wamid.ok", status: "delivered", timestamp: 1730000000, errorCode: null }

describe("whatsappEvents.service", () => {
    let settings: MockWhatsAppSettingsRepository
    let outbound: OutboundMessageStubRepository

    function service() {
        return createWhatsAppEventsService({ settings, outbound, now: () => NOW })
    }

    beforeEach(() => {
        settings = new MockWhatsAppSettingsRepository()
        outbound = new OutboundMessageStubRepository()
    })

    test("grava o ultimo evento do webhook com o now e nao aplica status quando a lista vem vazia", async () => {
        await service()({ statuses: [] })

        expect(settings.webhookEventTouches).toEqual([NOW])
        expect(outbound.appliedCalls).toEqual([])
    })

    test("normaliza os status recebidos e os aplica com o now depois de gravar o evento do webhook", async () => {
        await service()({
            statuses: [
                { providerMessageId: "wamid.falhou", status: "failed", timestamp: 1730000000, errorCode: "131047" },
                { providerMessageId: "wamid.lida", status: "read", timestamp: null, errorCode: null },
            ],
        })

        expect(settings.webhookEventTouches).toEqual([NOW])
        expect(outbound.appliedCalls).toEqual([
            {
                statuses: [
                    {
                        providerMessageId: "wamid.falhou",
                        status: "FAILED",
                        statusAt: new Date(1730000000 * 1000),
                        errorCode: "131047",
                    },
                    { providerMessageId: "wamid.lida", status: "READ", statusAt: null, errorCode: null },
                ],
                now: NOW,
            },
        ])
    })

    test.each([
        { label: "corpo sem statuses", body: {} },
        { label: "corpo que nao e objeto", body: "statuses" },
        { label: "statuses que nao e lista", body: { statuses: { ...VALID } } },
        { label: "status fora dos quatro", body: { statuses: [{ ...VALID, status: "deleted" }] } },
        { label: "status em maiusculas", body: { statuses: [{ ...VALID, status: "FAILED" }] } },
        { label: "providerMessageId vazio", body: { statuses: [{ ...VALID, providerMessageId: "" }] } },
        { label: "providerMessageId com 129 caracteres", body: { statuses: [{ ...VALID, providerMessageId: "w".repeat(129) }] } },
        { label: "providerMessageId que nao e texto", body: { statuses: [{ ...VALID, providerMessageId: 10 }] } },
        { label: "timestamp em texto", body: { statuses: [{ ...VALID, timestamp: "1730000000" }] } },
        { label: "timestamp ausente", body: { statuses: [{ providerMessageId: "wamid.ok", status: "sent", errorCode: null }] } },
        { label: "timestamp fora do intervalo de datas", body: { statuses: [{ ...VALID, timestamp: 1e300 }] } },
        { label: "errorCode numerico", body: { statuses: [{ ...VALID, errorCode: 131047 }] } },
        { label: "errorCode acima da coluna de 40 caracteres", body: { statuses: [{ ...VALID, errorCode: "1".repeat(41) }] } },
        { label: "item nulo", body: { statuses: [null] } },
    ])("recusa com 400 e nao grava nada: $label", async ({ body }) => {
        const result = service()(body)

        await expect(result).rejects.toBeInstanceOf(BadRequestError)
        await expect(result).rejects.toMatchObject({ statusCode: 400, code: "BAD_REQUEST" })
        expect(settings.webhookEventTouches).toEqual([])
        expect(outbound.appliedCalls).toEqual([])
    })
})
