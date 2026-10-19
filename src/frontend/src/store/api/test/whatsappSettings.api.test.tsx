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

function jsonResponse(body: unknown) {
    return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" }
    })
}

async function setup() {
    vi.stubEnv("VITE_API_URL", "https://api.example.com")
    vi.resetModules()
    const fetchMock = vi.fn(async (input: Request) => {
        if (input.url.endsWith("/pause")) {
            return jsonResponse({ data: { ...VIEW, autoReplyPaused: true } })
        }

        if (input.url.endsWith("/resume")) {
            return jsonResponse({ data: { ...VIEW, autoReplyPaused: false } })
        }

        return jsonResponse({ data: VIEW })
    })
    vi.stubGlobal("fetch", fetchMock)
    const { default: whatsappSettingsApi } = await import("@/store/api/whatsappSettings.api")
    const { default: createStore } = await import("@/store/createStore")
    const store = createStore()

    return { whatsappSettingsApi, store, fetchMock }
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
})
