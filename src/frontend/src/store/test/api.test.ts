import { configureStore } from "@reduxjs/toolkit"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

function jsonResponse(body: unknown) {
    return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" }
    })
}

async function setup() {
    vi.stubEnv("VITE_API_URL", "https://api.example.com")
    vi.resetModules()
    const { default: api } = await import("@/store/api")
    const { default: setToken } = await import("@/services/session/setToken")
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse({ id: "1" }))
    vi.stubGlobal("fetch", fetchMock)

    const itemsApi = api.injectEndpoints({
        endpoints: (build) => ({
            getItem: build.query<{ id: string }, void>({ query: () => "/items/1" })
        })
    })
    const store = configureStore({
        reducer: { [api.reducerPath]: api.reducer },
        middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware)
    })

    return { itemsApi, store, fetchMock, setToken }
}

function requestOf(fetchMock: ReturnType<typeof vi.fn>): Request {
    return fetchMock.mock.calls[0][0] as Request
}

beforeEach(() => {
    vi.resetModules()
})

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
})

describe("api", () => {
    it("começa sem endpoints e com o reducerPath api", async () => {
        const { default: api } = await import("@/store/api")

        expect(api.reducerPath).toBe("api")
        expect(Object.keys(api.endpoints)).toHaveLength(0)
    })

    it("devolve o dado do endpoint injetado e usa a URL base", async () => {
        const { itemsApi, store, fetchMock } = await setup()

        const result = await store.dispatch(itemsApi.endpoints.getItem.initiate())

        expect(result.data).toEqual({ id: "1" })
        expect(requestOf(fetchMock).url).toBe("https://api.example.com/items/1")
    })

    it("envia Accept-Language com o idioma ativo e as credenciais", async () => {
        const { itemsApi, store, fetchMock } = await setup()

        await store.dispatch(itemsApi.endpoints.getItem.initiate())

        expect(requestOf(fetchMock).headers.get("Accept-Language")).toBe("pt-BR")
        expect(requestOf(fetchMock).credentials).toBe("include")
        expect(requestOf(fetchMock).headers.get("Authorization")).toBeNull()
    })

    it("envia o token como Bearer quando há sessão", async () => {
        const { itemsApi, store, fetchMock, setToken } = await setup()
        setToken("abc")

        await store.dispatch(itemsApi.endpoints.getItem.initiate())

        expect(requestOf(fetchMock).headers.get("Authorization")).toBe("Bearer abc")
    })
})
