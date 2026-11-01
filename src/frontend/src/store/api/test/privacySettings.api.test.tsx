import { afterEach, describe, expect, it, vi } from "vitest"

const FIELDS = {
    controllerName: "Prefeitura de Jacareí",
    dpoName: "Maria Encarregada",
    contactEmail: "privacidade@exemplo.test",
    inPersonContact: null,
    retentionText: "Sessões por 12 meses."
}
const VIEW = {
    ...FIELDS,
    updatedBy: { id: 1, name: "Ana Paula" },
    updatedAt: "2026-11-01T12:00:00.000Z"
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
    const fetchMock = vi.fn(async () => jsonResponse({ data: VIEW }))
    vi.stubGlobal("fetch", fetchMock)
    const { default: privacySettingsApi } = await import("@/store/api/privacySettings.api")
    const { default: createStore } = await import("@/store/createStore")
    const store = createStore()

    return { privacySettingsApi, store, fetchMock }
}

function requestAt(fetchMock: ReturnType<typeof vi.fn>, index: number): Request {
    return fetchMock.mock.calls[index][0] as Request
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("privacySettingsApi", () => {
    it("lê GET /api/v1/whatsapp/settings/privacy e devolve o data do envelope", async () => {
        const { privacySettingsApi, store, fetchMock } = await setup()

        const result = await store.dispatch(
            privacySettingsApi.endpoints.getPrivacySettings.initiate()
        )

        expect(result.data).toEqual(VIEW)
        expect(requestAt(fetchMock, 0).method).toBe("GET")
        expect(requestAt(fetchMock, 0).url).toBe(
            "https://api.example.com/api/v1/whatsapp/settings/privacy"
        )
    })

    it("salva com PUT /api/v1/whatsapp/settings/privacy enviando as cinco chaves", async () => {
        const { privacySettingsApi, store, fetchMock } = await setup()

        const result = await store.dispatch(
            privacySettingsApi.endpoints.savePrivacySettings.initiate(FIELDS)
        )

        expect(result.data).toEqual(VIEW)
        expect(requestAt(fetchMock, 0).method).toBe("PUT")
        expect(requestAt(fetchMock, 0).url).toBe(
            "https://api.example.com/api/v1/whatsapp/settings/privacy"
        )
        expect(await requestAt(fetchMock, 0).json()).toEqual(FIELDS)
    })
})
