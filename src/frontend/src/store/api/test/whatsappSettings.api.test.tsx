import { waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const VIEW = {
    phoneNumberId: "100000000000001",
    businessAccountId: "200000000000002",
    accessToken: { configured: true, last4: "a91F" },
    appSecret: { configured: true, last4: "9c2e" },
    verifyToken: "3f9a".repeat(16),
    webhookUrl: null,
    graphApiVersion: "v26.0",
    credentialsValid: true,
    credentialsCheckedAt: null,
    autoReplyPaused: false,
    pausedMessage: "Mensagem fixa",
    updatedBy: null,
    updatedAt: "2026-10-14T13:00:00.000Z",
    displayPhoneNumber: null,
    verifiedName: null,
    accessTokenLifetime: { kind: "UNKNOWN", expiresAt: null }
}

type Failing = { pause?: boolean; resume?: boolean }

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" }
    })
}

function serverError() {
    return jsonResponse({ error: { code: "INTERNAL_SERVER_ERROR", message: "x" } }, 500)
}

async function setup(failing: Failing = {}) {
    vi.stubEnv("VITE_API_URL", "https://api.example.com")
    vi.resetModules()
    const fetchMock = vi.fn(async (input: Request) => {
        if (input.url.endsWith("/templates")) {
            return jsonResponse({
                data: {
                    checkedAt: "2026-10-14T13:00:00.000Z",
                    templates: [
                        {
                            kind: "CANCELLATION",
                            name: "aviso_cancelamento",
                            languageCode: "pt_BR",
                            status: "APPROVED",
                            metaStatus: "APPROVED"
                        }
                    ]
                }
            })
        }

        if (input.url.endsWith("/number-status")) {
            return jsonResponse({
                data: {
                    checkedAt: "2026-10-14T13:00:00.000Z",
                    qualityRating: "HIGH",
                    messagingLimit: {
                        tier: "TIER_250",
                        dailyLimit: 250,
                        usedLast24h: 50
                    }
                }
            })
        }

        if (input.url.endsWith("/delivery-failures")) {
            return jsonResponse({
                data: { since: "2026-10-14T13:00:00.000Z", count: 0, items: [] }
            })
        }

        if (input.url.endsWith("/history")) {
            return jsonResponse({ data: { items: [] } })
        }

        if (input.url.endsWith("/pause")) {
            return failing.pause
                ? serverError()
                : jsonResponse({ data: { ...VIEW, autoReplyPaused: true } })
        }

        if (input.url.endsWith("/resume")) {
            return failing.resume
                ? serverError()
                : jsonResponse({ data: { ...VIEW, autoReplyPaused: false } })
        }

        return jsonResponse({ data: VIEW })
    })
    vi.stubGlobal("fetch", fetchMock)
    const { default: whatsappSettingsApi } = await import("@/store/api/whatsappSettings.api")
    const { default: createStore } = await import("@/store/createStore")
    const store = createStore()

    return { whatsappSettingsApi, store, fetchMock }
}

function historyReads(fetchMock: ReturnType<typeof vi.fn>): unknown[] {
    return fetchMock.mock.calls.filter(([input]) => (input as Request).url.endsWith("/history"))
}

function settle(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0))
}

function requestAt(fetchMock: ReturnType<typeof vi.fn>, index: number): Request {
    return fetchMock.mock.calls[index][0] as Request
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("whatsappSettingsApi", () => {
    it("lê GET /api/v1/whatsapp/settings com as credenciais e devolve o data do envelope", async () => {
        const { whatsappSettingsApi, store, fetchMock } = await setup()

        const result = await store.dispatch(
            whatsappSettingsApi.endpoints.getWhatsAppSettings.initiate()
        )

        expect(result.data).toEqual(VIEW)
        expect(requestAt(fetchMock, 0).method).toBe("GET")
        expect(requestAt(fetchMock, 0).url).toBe("https://api.example.com/api/v1/whatsapp/settings")
        expect(requestAt(fetchMock, 0).credentials).toBe("include")
    })

    it("lê as falhas de entrega das últimas 24 horas", async () => {
        const { whatsappSettingsApi, store, fetchMock } = await setup()

        const result = await store.dispatch(
            whatsappSettingsApi.endpoints.getWhatsAppDeliveryFailures.initiate()
        )

        expect(result.data).toEqual({
            since: "2026-10-14T13:00:00.000Z",
            count: 0,
            items: []
        })
        expect(requestAt(fetchMock, 0).url).toBe(
            "https://api.example.com/api/v1/whatsapp/settings/delivery-failures"
        )
        expect(requestAt(fetchMock, 0).credentials).toBe("include")
    })

    it("lê as alterações recentes da configuração do WhatsApp", async () => {
        const { whatsappSettingsApi, store, fetchMock } = await setup()

        const result = await store.dispatch(
            whatsappSettingsApi.endpoints.getWhatsAppHistory.initiate()
        )

        expect(result.data).toEqual({ items: [] })
        expect(requestAt(fetchMock, 0).url).toBe(
            "https://api.example.com/api/v1/whatsapp/settings/history"
        )
        expect(requestAt(fetchMock, 0).credentials).toBe("include")
    })

    it("lê os estados dos modelos de mensagem consultados na Meta", async () => {
        const { whatsappSettingsApi, store, fetchMock } = await setup()

        const result = await store.dispatch(
            whatsappSettingsApi.endpoints.getWhatsAppTemplatesStatus.initiate()
        )

        expect(result.data?.templates[0]).toMatchObject({
            kind: "CANCELLATION",
            status: "APPROVED"
        })
        expect(requestAt(fetchMock, 0).url).toBe(
            "https://api.example.com/api/v1/whatsapp/settings/templates"
        )
    })

    it("lê qualidade, limite diário e uso do número na Meta", async () => {
        const { whatsappSettingsApi, store, fetchMock } = await setup()

        const result = await store.dispatch(
            whatsappSettingsApi.endpoints.getWhatsAppNumberMetaStatus.initiate()
        )

        expect(result.data).toMatchObject({
            qualityRating: "HIGH",
            messagingLimit: { tier: "TIER_250", dailyLimit: 250, usedLast24h: 50 }
        })
        expect(requestAt(fetchMock, 0).url).toBe(
            "https://api.example.com/api/v1/whatsapp/settings/number-status"
        )
    })

    it("pausa com POST /pause e devolve a leitura", async () => {
        const { whatsappSettingsApi, store, fetchMock } = await setup()

        const result = await store.dispatch(
            whatsappSettingsApi.endpoints.pauseWhatsAppReplies.initiate()
        )

        expect(result.data).toEqual({ ...VIEW, autoReplyPaused: true })
        expect(requestAt(fetchMock, 0).method).toBe("POST")
        expect(requestAt(fetchMock, 0).url).toBe(
            "https://api.example.com/api/v1/whatsapp/settings/pause"
        )
        expect(requestAt(fetchMock, 0).credentials).toBe("include")
    })

    it("reativa com POST /resume e devolve a leitura", async () => {
        const { whatsappSettingsApi, store, fetchMock } = await setup()

        const result = await store.dispatch(
            whatsappSettingsApi.endpoints.resumeWhatsAppReplies.initiate()
        )

        expect(result.data).toEqual({ ...VIEW, autoReplyPaused: false })
        expect(requestAt(fetchMock, 0).method).toBe("POST")
        expect(requestAt(fetchMock, 0).url).toBe(
            "https://api.example.com/api/v1/whatsapp/settings/resume"
        )
    })

    it("depois de pausar e de reativar, a leitura em cache traz a view da mutation sem nova requisição", async () => {
        const { whatsappSettingsApi, store, fetchMock } = await setup()
        const subscription = store.dispatch(
            whatsappSettingsApi.endpoints.getWhatsAppSettings.initiate()
        )
        await subscription
        const read = () =>
            whatsappSettingsApi.endpoints.getWhatsAppSettings.select()(store.getState())

        await store.dispatch(whatsappSettingsApi.endpoints.pauseWhatsAppReplies.initiate())
        const afterPause = read().data?.autoReplyPaused
        await store.dispatch(whatsappSettingsApi.endpoints.resumeWhatsAppReplies.initiate())

        expect(afterPause).toBe(true)
        expect(read().data?.autoReplyPaused).toBe(false)
        expect(fetchMock).toHaveBeenCalledTimes(3)
        subscription.unsubscribe()
    })

    it("não recebe argumento nas mutações, então nenhum segredo entra no estado da store", async () => {
        const { whatsappSettingsApi, store } = await setup()

        await store.dispatch(whatsappSettingsApi.endpoints.pauseWhatsAppReplies.initiate())

        const mutations = Object.values(store.getState().api.mutations) as Array<{
            endpointName?: string
            originalArgs?: unknown
        }>
        expect(mutations).toHaveLength(1)
        expect(mutations[0]?.endpointName).toBe("pauseWhatsAppReplies")
        expect(mutations[0]?.originalArgs).toBeUndefined()
    })

    it("não pede o histórico de novo quando a pausa falha", async () => {
        const { whatsappSettingsApi, store, fetchMock } = await setup({ pause: true })
        const subscription = store.dispatch(
            whatsappSettingsApi.endpoints.getWhatsAppHistory.initiate()
        )
        await subscription

        await store.dispatch(whatsappSettingsApi.endpoints.pauseWhatsAppReplies.initiate())
        await settle()

        expect(historyReads(fetchMock)).toHaveLength(1)
        subscription.unsubscribe()
    })

    it("não pede o histórico de novo quando a reativação falha", async () => {
        const { whatsappSettingsApi, store, fetchMock } = await setup({ resume: true })
        const subscription = store.dispatch(
            whatsappSettingsApi.endpoints.getWhatsAppHistory.initiate()
        )
        await subscription

        await store.dispatch(whatsappSettingsApi.endpoints.resumeWhatsAppReplies.initiate())
        await settle()

        expect(historyReads(fetchMock)).toHaveLength(1)
        subscription.unsubscribe()
    })

    it("pede o histórico de novo depois de pausar", async () => {
        const { whatsappSettingsApi, store, fetchMock } = await setup()
        const subscription = store.dispatch(
            whatsappSettingsApi.endpoints.getWhatsAppHistory.initiate()
        )
        await subscription

        await store.dispatch(whatsappSettingsApi.endpoints.pauseWhatsAppReplies.initiate())

        await waitFor(() => expect(historyReads(fetchMock)).toHaveLength(2))
        subscription.unsubscribe()
    })

    it("pede o histórico de novo depois de reativar", async () => {
        const { whatsappSettingsApi, store, fetchMock } = await setup()
        const subscription = store.dispatch(
            whatsappSettingsApi.endpoints.getWhatsAppHistory.initiate()
        )
        await subscription

        await store.dispatch(whatsappSettingsApi.endpoints.resumeWhatsAppReplies.initiate())

        await waitFor(() => expect(historyReads(fetchMock)).toHaveLength(2))
        subscription.unsubscribe()
    })
})
