import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
    del,
    get,
    HttpError,
    onUnauthorized,
    patch,
    post,
    put,
    setTokenRefresher
} from "@/services/http.service"
import { clearToken, getToken, setToken } from "@/services/session.service"

const fetchMock = vi.fn()

function jsonResponse(status: number, body?: unknown): Response {
    return new Response(body === undefined ? null : JSON.stringify(body), { status })
}

function headersOf(call: number): Record<string, string> {
    return fetchMock.mock.calls[call][1].headers
}

describe("http.service", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", fetchMock)
        vi.stubEnv("VITE_API_URL", "http://api.test")
    })

    afterEach(() => {
        fetchMock.mockReset()
        vi.unstubAllGlobals()
        vi.unstubAllEnvs()
        setTokenRefresher(null)
        onUnauthorized(null)
        clearToken()
    })

    it("prefixa a URL da API, envia credenciais e devolve o corpo em sucesso", async () => {
        fetchMock.mockResolvedValue(jsonResponse(200, { id: "1" }))

        await expect(get<{ id: string }>("/api/v1/x")).resolves.toEqual({ id: "1" })

        expect(fetchMock).toHaveBeenCalledWith(
            "http://api.test/api/v1/x",
            expect.objectContaining({ method: "GET", credentials: "include" })
        )
        expect(headersOf(0).Authorization).toBeUndefined()
        expect(headersOf(0)["Content-Type"]).toBeUndefined()
    })

    it("envia o token como Bearer quando há sessão", async () => {
        setToken("abc")
        fetchMock.mockResolvedValue(jsonResponse(200, {}))

        await get("/x")

        expect(headersOf(0).Authorization).toBe("Bearer abc")
    })

    it("serializa o corpo e define Content-Type em post, put e patch", async () => {
        fetchMock.mockImplementation(async () => jsonResponse(200, { ok: true }))

        await post("/x", { a: 1 })
        await put("/x", { a: 2 })
        await patch("/x", { a: 3 })

        expect(fetchMock.mock.calls.map((call) => call[1].method)).toEqual(["POST", "PUT", "PATCH"])
        expect(fetchMock.mock.calls.map((call) => call[1].body)).toEqual([
            '{"a":1}',
            '{"a":2}',
            '{"a":3}'
        ])
        expect(headersOf(0)["Content-Type"]).toBe("application/json")
    })

    it("aceita resposta 204 sem corpo em del", async () => {
        fetchMock.mockResolvedValue(jsonResponse(204))

        await expect(del("/x")).resolves.toBeUndefined()
        expect(fetchMock.mock.calls[0][1].method).toBe("DELETE")
    })

    it("converte erro do backend em HttpError com status, código e mensagem", async () => {
        fetchMock.mockResolvedValue(
            jsonResponse(400, { error: { code: "BAD_REQUEST", message: "campo ausente" } })
        )

        const error = (await get("/x").catch((caught) => caught)) as HttpError

        expect(error).toBeInstanceOf(HttpError)
        expect(error.status).toBe(400)
        expect(error.code).toBe("BAD_REQUEST")
        expect(error.message).toBe("campo ausente")
    })

    it("usa mensagem genérica quando o corpo do erro não é JSON", async () => {
        fetchMock.mockResolvedValue(new Response("falha", { status: 500 }))

        await expect(get("/x")).rejects.toThrow("Requisição falhou com status 500.")
    })

    it("sem refresher, 401 limpa o token e chama onUnauthorized", async () => {
        setToken("abc")
        const handler = vi.fn()
        onUnauthorized(handler)
        fetchMock.mockResolvedValue(jsonResponse(401, { error: { message: "expirado" } }))

        await expect(get("/x")).rejects.toMatchObject({ status: 401 })

        expect(getToken()).toBeNull()
        expect(handler).toHaveBeenCalledTimes(1)
        expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it("com refresher, renova o token e repete a requisição uma vez", async () => {
        setToken("velho")
        const refresher = vi.fn().mockResolvedValue("novo")
        setTokenRefresher(refresher)
        fetchMock
            .mockResolvedValueOnce(jsonResponse(401))
            .mockResolvedValueOnce(jsonResponse(200, { ok: true }))

        await expect(get("/x")).resolves.toEqual({ ok: true })

        expect(refresher).toHaveBeenCalledTimes(1)
        expect(getToken()).toBe("novo")
        expect(fetchMock).toHaveBeenCalledTimes(2)
        expect(headersOf(1).Authorization).toBe("Bearer novo")
    })

    it("não repete em loop quando a segunda tentativa também devolve 401", async () => {
        const handler = vi.fn()
        onUnauthorized(handler)
        const refresher = vi.fn().mockResolvedValue("novo")
        setTokenRefresher(refresher)
        fetchMock.mockImplementation(async () => jsonResponse(401))

        await expect(get("/x")).rejects.toMatchObject({ status: 401 })

        expect(refresher).toHaveBeenCalledTimes(1)
        expect(fetchMock).toHaveBeenCalledTimes(2)
        expect(handler).toHaveBeenCalledTimes(1)
        expect(getToken()).toBeNull()
    })

    it("quando o refresh falha, limpa o token e chama onUnauthorized sem repetir", async () => {
        setToken("velho")
        const handler = vi.fn()
        onUnauthorized(handler)
        setTokenRefresher(vi.fn().mockRejectedValue(new Error("sem cookie")))
        fetchMock.mockResolvedValue(jsonResponse(401))

        await expect(get("/x")).rejects.toMatchObject({ status: 401 })

        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect(getToken()).toBeNull()
        expect(handler).toHaveBeenCalledTimes(1)
    })
})
