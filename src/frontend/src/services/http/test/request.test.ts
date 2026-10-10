import { afterEach, describe, expect, it, vi } from "vitest"

function jsonResponse(status: number, body?: unknown): Response {
    return new Response(body === undefined ? null : JSON.stringify(body), { status })
}

async function setup(apiUrl = "http://api.test") {
    vi.stubEnv("VITE_API_URL", apiUrl)
    vi.resetModules()
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const { default: request } = await import("@/services/http/request")
    const { default: setTokenRefresher } = await import("@/services/http/setTokenRefresher")
    const { default: onUnauthorized } = await import("@/services/http/onUnauthorized")
    const { default: HttpError } = await import("@/services/http/HttpError")
    const { default: setToken } = await import("@/services/session/setToken")
    const { default: getToken } = await import("@/services/session/getToken")

    function headersOf(call: number): Record<string, string> {
        return fetchMock.mock.calls[call][1].headers
    }

    return {
        request,
        setTokenRefresher,
        onUnauthorized,
        HttpError,
        setToken,
        getToken,
        fetchMock,
        headersOf
    }
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

    it("envia o token como Bearer quando há sessão", async () => {
        const { request, setToken, fetchMock, headersOf } = await setup()
        setToken("abc")
        fetchMock.mockResolvedValue(jsonResponse(200, {}))

        await request("GET", "/x")

        expect(headersOf(0).Authorization).toBe("Bearer abc")
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

    it("sem refresher, 401 limpa o token e chama onUnauthorized", async () => {
        const { request, onUnauthorized, setToken, getToken, fetchMock } = await setup()
        setToken("abc")
        const handler = vi.fn()
        onUnauthorized(handler)
        fetchMock.mockResolvedValue(jsonResponse(401, { error: { message: "expirado" } }))

        await expect(request("GET", "/x")).rejects.toMatchObject({
            status: 401,
            message: "expirado"
        })

        expect(getToken()).toBeNull()
        expect(handler).toHaveBeenCalledTimes(1)
        expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it("com refresher, renova o token e repete a requisição uma vez", async () => {
        const { request, setTokenRefresher, setToken, getToken, fetchMock, headersOf } =
            await setup()
        setToken("velho")
        const refresher = vi.fn().mockResolvedValue("novo")
        setTokenRefresher(refresher)
        fetchMock
            .mockResolvedValueOnce(jsonResponse(401))
            .mockResolvedValueOnce(jsonResponse(200, { ok: true }))

        await expect(request("GET", "/x")).resolves.toEqual({ ok: true })

        expect(refresher).toHaveBeenCalledTimes(1)
        expect(getToken()).toBe("novo")
        expect(fetchMock).toHaveBeenCalledTimes(2)
        expect(headersOf(1).Authorization).toBe("Bearer novo")
    })

    it("não repete em loop quando a segunda tentativa também devolve 401", async () => {
        const { request, setTokenRefresher, onUnauthorized, getToken, fetchMock } = await setup()
        const handler = vi.fn()
        onUnauthorized(handler)
        const refresher = vi.fn().mockResolvedValue("novo")
        setTokenRefresher(refresher)
        fetchMock.mockImplementation(async () => jsonResponse(401))

        await expect(request("GET", "/x")).rejects.toMatchObject({ status: 401 })

        expect(refresher).toHaveBeenCalledTimes(1)
        expect(fetchMock).toHaveBeenCalledTimes(2)
        expect(handler).toHaveBeenCalledTimes(1)
        expect(getToken()).toBeNull()
    })

    it("quando o refresh falha, limpa o token e chama onUnauthorized sem repetir", async () => {
        const { request, setTokenRefresher, onUnauthorized, setToken, getToken, fetchMock } =
            await setup()
        setToken("velho")
        const handler = vi.fn()
        onUnauthorized(handler)
        setTokenRefresher(vi.fn().mockRejectedValue(new Error("sem cookie")))
        fetchMock.mockResolvedValue(jsonResponse(401))

        await expect(request("GET", "/x")).rejects.toMatchObject({ status: 401 })

        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect(getToken()).toBeNull()
        expect(handler).toHaveBeenCalledTimes(1)
    })

    it("compartilha um único refresh entre requisições simultâneas", async () => {
        const { request, setTokenRefresher, fetchMock } = await setup()
        const refresh = Promise.withResolvers<string | null>()
        const refresher = vi.fn(() => refresh.promise)
        setTokenRefresher(refresher)
        fetchMock
            .mockResolvedValueOnce(jsonResponse(401))
            .mockResolvedValueOnce(jsonResponse(401))
            .mockImplementation(async () => jsonResponse(200, {}))

        const requests = Promise.all([request("GET", "/a"), request("GET", "/b")])
        await vi.waitFor(() => expect(refresher).toHaveBeenCalled())
        await new Promise((resolve) => setTimeout(resolve, 0))
        refresh.resolve("novo")
        await requests

        expect(refresher).toHaveBeenCalledTimes(1)
        expect(fetchMock).toHaveBeenCalledTimes(4)
    })
})
