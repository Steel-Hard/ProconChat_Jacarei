import { configureStore } from "@reduxjs/toolkit"
import { afterEach, describe, expect, it, vi } from "vitest"

const REFRESH_URL = "https://api.example.com/api/v1/auth/refresh"

function jsonResponse(status: number, body?: unknown) {
    return new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" }
    })
}

function urlOf(input: RequestInfo | URL): string {
    if (typeof input === "string") {
        return input
    }

    return input instanceof URL ? input.href : input.url
}

type Responder = (url: string) => Response | Promise<Response>

async function setup(responder: Responder) {
    vi.stubEnv("VITE_API_URL", "https://api.example.com")
    vi.resetModules()
    const fetchMock = vi.fn((input: RequestInfo | URL) => Promise.resolve(responder(urlOf(input))))
    vi.stubGlobal("fetch", fetchMock)
    const { default: api } = await import("@/store/api")
    const { default: onUnauthorized } = await import("@/services/http/onUnauthorized")
    const handler = vi.fn()
    onUnauthorized(handler)

    const itemsApi = api.injectEndpoints({
        endpoints: (build) => ({
            getItem: build.query<{ id: string }, string>({ query: (id) => `/items/${id}` })
        })
    })
    const store = configureStore({
        reducer: { [api.reducerPath]: api.reducer },
        middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware)
    })

    function callsTo(url: string) {
        return fetchMock.mock.calls.filter(([input]) => urlOf(input) === url)
    }

    return { itemsApi, store, handler, callsTo }
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("baseQueryWithSessionRenewal", () => {
    it("devolve o dado sem renovar a sessão quando a query responde 200", async () => {
        const { itemsApi, store, handler, callsTo } = await setup(() =>
            jsonResponse(200, { id: "1" })
        )

        const result = await store.dispatch(itemsApi.endpoints.getItem.initiate("1"))

        expect(result.data).toEqual({ id: "1" })
        expect(callsTo(REFRESH_URL)).toHaveLength(0)
        expect(handler).not.toHaveBeenCalled()
    })

    it("renova a sessão no 401 e repete a query uma vez", async () => {
        let attempts = 0
        const { itemsApi, store, handler, callsTo } = await setup((url) => {
            if (url === REFRESH_URL) {
                return jsonResponse(204)
            }
            attempts += 1
            return attempts === 1 ? jsonResponse(401) : jsonResponse(200, { id: "1" })
        })

        const result = await store.dispatch(itemsApi.endpoints.getItem.initiate("1"))

        expect(result.data).toEqual({ id: "1" })
        expect(callsTo(REFRESH_URL)).toHaveLength(1)
        expect(callsTo("https://api.example.com/items/1")).toHaveLength(2)
        expect(handler).not.toHaveBeenCalled()
    })

    it("chama onUnauthorized e devolve o erro quando o refresh responde 401", async () => {
        const { itemsApi, store, handler, callsTo } = await setup(() => jsonResponse(401))

        const result = await store.dispatch(itemsApi.endpoints.getItem.initiate("1"))

        expect(result.error).toMatchObject({ status: 401 })
        expect(handler).toHaveBeenCalledTimes(1)
        expect(callsTo("https://api.example.com/items/1")).toHaveLength(1)
    })

    it("chama onUnauthorized sem segundo refresh quando a repetição também responde 401", async () => {
        const { itemsApi, store, handler, callsTo } = await setup((url) =>
            url === REFRESH_URL ? jsonResponse(204) : jsonResponse(401)
        )

        const result = await store.dispatch(itemsApi.endpoints.getItem.initiate("1"))

        expect(result.error).toMatchObject({ status: 401 })
        expect(callsTo(REFRESH_URL)).toHaveLength(1)
        expect(callsTo("https://api.example.com/items/1")).toHaveLength(2)
        expect(handler).toHaveBeenCalledTimes(1)
    })

    it("faz um único refresh quando duas queries recebem 401 ao mesmo tempo", async () => {
        const refresh = Promise.withResolvers<Response>()
        const attempts: Record<string, number> = {}
        const { itemsApi, store, callsTo } = await setup((url) => {
            if (url === REFRESH_URL) {
                return refresh.promise
            }
            attempts[url] = (attempts[url] ?? 0) + 1
            return attempts[url] === 1 ? jsonResponse(401) : jsonResponse(200, { id: url })
        })

        const queries = Promise.all([
            store.dispatch(itemsApi.endpoints.getItem.initiate("1")),
            store.dispatch(itemsApi.endpoints.getItem.initiate("2"))
        ])
        await vi.waitFor(() => expect(callsTo(REFRESH_URL)).toHaveLength(1))
        await new Promise((resolve) => setTimeout(resolve, 0))
        refresh.resolve(jsonResponse(204))
        const [first, second] = await queries

        expect(callsTo(REFRESH_URL)).toHaveLength(1)
        expect(first.data).toEqual({ id: "https://api.example.com/items/1" })
        expect(second.data).toEqual({ id: "https://api.example.com/items/2" })
    })
})
