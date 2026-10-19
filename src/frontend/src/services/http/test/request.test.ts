import { afterEach, describe, expect, it, vi } from "vitest"

const REFRESH_URL = "http://api.test/api/v1/auth/refresh"

function jsonResponse(status: number, body?: unknown): Response {
    return new Response(body === undefined ? null : JSON.stringify(body), { status })
}

async function setup(apiUrl = "http://api.test") {
    vi.stubEnv("VITE_API_URL", apiUrl)
    vi.resetModules()
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const { default: request } = await import("@/services/http/request")
    const { default: onUnauthorized } = await import("@/services/http/onUnauthorized")
    const { default: HttpError } = await import("@/services/http/HttpError")

    function headersOf(call: number): Record<string, string> {
        return fetchMock.mock.calls[call][1].headers
    }

    function callsTo(url: string) {
        return fetchMock.mock.calls.filter(([input]) => input === url)
    }

    return { request, onUnauthorized, HttpError, fetchMock, headersOf, callsTo }
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("request", () => {
    it("prefixa a URL da API, envia credenciais e idioma e devolve o corpo em sucesso", async () => {
        const { request, fetchMock, headersOf } = await setup()
        fetchMock.mockResolvedValue(jsonResponse(200, { id: "1" }))

        await expect(request<{ id: string }>("GET", "/api/v1/x")).resolves.toEqual({ id: "1" })

        expect(fetchMock).toHaveBeenCalledWith(
            "http://api.test/api/v1/x",
            expect.objectContaining({ method: "GET", credentials: "include" })
        )
        expect(headersOf(0)["Accept-Language"]).toBe("pt-BR")
        expect(headersOf(0).Authorization).toBeUndefined()
        expect(headersOf(0)["Content-Type"]).toBeUndefined()
    })

    it("usa caminho relativo quando VITE_API_URL está vazia", async () => {
        const { request, fetchMock } = await setup("")
        fetchMock.mockResolvedValue(jsonResponse(200, {}))

        await request("GET", "/api/v1/x")

        expect(fetchMock).toHaveBeenCalledWith("/api/v1/x", expect.anything())
    })

    it("não envia o cabeçalho Authorization", async () => {
        const { request, fetchMock, headersOf } = await setup()
        fetchMock.mockResolvedValue(jsonResponse(200, {}))

        await request("GET", "/x")

        expect(headersOf(0)).not.toHaveProperty("Authorization")
    })

    it("não envia Authorization numa requisição com corpo e usa as credenciais", async () => {
        const { request, fetchMock, headersOf } = await setup()
        fetchMock.mockResolvedValue(jsonResponse(200, {}))

        await request("POST", "/x", { a: 1 })

        expect(headersOf(0)).not.toHaveProperty("Authorization")
        expect(fetchMock.mock.calls[0][1].credentials).toBe("include")
    })

    it("serializa o corpo e define Content-Type quando há corpo", async () => {
        const { request, fetchMock, headersOf } = await setup()
        fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }))

        await request("POST", "/x", { a: 1 })

        expect(fetchMock.mock.calls[0][1].body).toBe('{"a":1}')
        expect(headersOf(0)["Content-Type"]).toBe("application/json")
    })

    it("repassa o AbortSignal ao fetch", async () => {
        const { request, fetchMock } = await setup()
        fetchMock.mockResolvedValue(jsonResponse(200, {}))
        const controller = new AbortController()

        await request("GET", "/x", undefined, { signal: controller.signal })

        expect(fetchMock.mock.calls[0][1].signal).toBe(controller.signal)
    })

    it("converte erro do backend em HttpError com status, código e mensagem", async () => {
        const { request, HttpError, fetchMock } = await setup()
        fetchMock.mockResolvedValue(
            jsonResponse(400, { error: { code: "BAD_REQUEST", message: "campo ausente" } })
        )

        const error = await request("GET", "/x").catch((caught: unknown) => caught)

        expect(error).toBeInstanceOf(HttpError)
        expect(error).toMatchObject({ status: 400, code: "BAD_REQUEST", message: "campo ausente" })
    })

    it("quando o refresh responde 401, chama onUnauthorized uma vez e rejeita com o 401 original", async () => {
        const { request, onUnauthorized, fetchMock, callsTo } = await setup()
        const handler = vi.fn()
        onUnauthorized(handler)
        fetchMock.mockImplementation(async (url: string) =>
            url === REFRESH_URL
                ? jsonResponse(401, { error: { message: "sem refresh" } })
                : jsonResponse(401, { error: { message: "expirado" } })
        )

        await expect(request("GET", "/x")).rejects.toMatchObject({
            status: 401,
            message: "expirado"
        })

        expect(handler).toHaveBeenCalledTimes(1)
        expect(callsTo("http://api.test/x")).toHaveLength(1)
        expect(callsTo(REFRESH_URL)).toHaveLength(1)
    })

    it("com o refresh em 204, repete a requisição uma vez", async () => {
        const { request, onUnauthorized, fetchMock, callsTo } = await setup()
        const handler = vi.fn()
        onUnauthorized(handler)
        fetchMock
            .mockResolvedValueOnce(jsonResponse(401))
            .mockResolvedValueOnce(jsonResponse(204))
            .mockResolvedValueOnce(jsonResponse(200, { ok: true }))

        await expect(request("GET", "/x")).resolves.toEqual({ ok: true })

        expect(callsTo("http://api.test/x")).toHaveLength(2)
        expect(callsTo(REFRESH_URL)).toHaveLength(1)
        expect(handler).not.toHaveBeenCalled()
    })

    it("repete a requisição com o mesmo método, corpo e sinal depois do refresh", async () => {
        const { request, fetchMock } = await setup()
        const controller = new AbortController()
        fetchMock
            .mockResolvedValueOnce(jsonResponse(401))
            .mockResolvedValueOnce(jsonResponse(204))
            .mockResolvedValueOnce(jsonResponse(200, { ok: true }))

        await request("PUT", "/x", { a: 1 }, { signal: controller.signal })

        expect(fetchMock.mock.calls[2][0]).toBe("http://api.test/x")
        expect(fetchMock.mock.calls[2][1]).toMatchObject({
            method: "PUT",
            body: '{"a":1}',
            signal: controller.signal
        })
    })

    it("faz o refresh com POST, sem corpo, com credenciais e sem Authorization", async () => {
        const { request, fetchMock, callsTo } = await setup()
        fetchMock
            .mockResolvedValueOnce(jsonResponse(401))
            .mockResolvedValueOnce(jsonResponse(204))
            .mockResolvedValueOnce(jsonResponse(200, {}))

        await request("GET", "/x")

        const [, init] = callsTo(REFRESH_URL)[0]
        expect(init).toMatchObject({ method: "POST", credentials: "include" })
        expect(init.body).toBeUndefined()
        expect(init.headers).not.toHaveProperty("Authorization")
    })

    it("não repete em loop quando a segunda tentativa também devolve 401", async () => {
        const { request, onUnauthorized, fetchMock, callsTo } = await setup()
        const handler = vi.fn()
        onUnauthorized(handler)
        fetchMock.mockImplementation(async (url: string) =>
            url === REFRESH_URL ? jsonResponse(204) : jsonResponse(401)
        )

        await expect(request("GET", "/x")).rejects.toMatchObject({ status: 401 })

        expect(callsTo(REFRESH_URL)).toHaveLength(1)
        expect(callsTo("http://api.test/x")).toHaveLength(2)
        expect(handler).toHaveBeenCalledTimes(1)
    })

    it("quando o refresh falha por rede, chama onUnauthorized sem repetir", async () => {
        const { request, onUnauthorized, fetchMock, callsTo } = await setup()
        const handler = vi.fn()
        onUnauthorized(handler)
        fetchMock.mockImplementation(async (url: string) => {
            if (url === REFRESH_URL) {
                throw new TypeError("Failed to fetch")
            }
            return jsonResponse(401)
        })

        await expect(request("GET", "/x")).rejects.toMatchObject({ status: 401 })

        expect(callsTo("http://api.test/x")).toHaveLength(1)
        expect(handler).toHaveBeenCalledTimes(1)
    })

    it("com skipSessionRenewal, o 401 rejeita sem refresh nem onUnauthorized", async () => {
        const { request, onUnauthorized, HttpError, fetchMock } = await setup()
        const handler = vi.fn()
        onUnauthorized(handler)
        fetchMock.mockResolvedValue(
            jsonResponse(401, { error: { code: "UNAUTHORIZED", message: "senha errada" } })
        )

        const error = await request("POST", "/login", { a: 1 }, { skipSessionRenewal: true }).catch(
            (caught: unknown) => caught
        )

        expect(error).toBeInstanceOf(HttpError)
        expect(error).toMatchObject({ status: 401, code: "UNAUTHORIZED" })
        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect(handler).not.toHaveBeenCalled()
    })

    it("compartilha um único refresh entre requisições simultâneas", async () => {
        const { request, fetchMock, callsTo } = await setup()
        const refresh = Promise.withResolvers<Response>()
        let firstAttempts = 0
        fetchMock.mockImplementation((url: string) => {
            if (url === REFRESH_URL) {
                return refresh.promise
            }
            firstAttempts += 1
            return Promise.resolve(firstAttempts <= 2 ? jsonResponse(401) : jsonResponse(200, {}))
        })

        const requests = Promise.all([request("GET", "/a"), request("GET", "/b")])
        await vi.waitFor(() => expect(callsTo(REFRESH_URL)).toHaveLength(1))
        await new Promise((resolve) => setTimeout(resolve, 0))
        refresh.resolve(jsonResponse(204))
        await requests

        expect(callsTo(REFRESH_URL)).toHaveLength(1)
        expect(fetchMock).toHaveBeenCalledTimes(5)
    })
})
