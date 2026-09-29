import { afterEach, describe, expect, it, vi } from "vitest"
import { get, post } from "@/services/http.service"

function mockFetch(response: Partial<Response>) {
    const fetchMock = vi.fn().mockResolvedValue(response as Response)
    vi.stubGlobal("fetch", fetchMock)
    return fetchMock
}

afterEach(() => {
    vi.unstubAllGlobals()
})

describe("get", () => {
    it("devolve o corpo da resposta em JSON", async () => {
        mockFetch({ ok: true, json: async () => ({ id: "1" }) })

        await expect(get<{ id: string }>("/api/example")).resolves.toEqual({ id: "1" })
    })

    it("envia o método GET e aceita JSON", async () => {
        const fetchMock = mockFetch({ ok: true, json: async () => ({}) })

        await get("/api/example")

        expect(fetchMock).toHaveBeenCalledWith("/api/example", {
            method: "GET",
            headers: { Accept: "application/json" }
        })
    })

    it("lança um erro com o status quando a resposta não é ok", async () => {
        mockFetch({ ok: false, status: 404, json: async () => ({}) })

        await expect(get("/api/example")).rejects.toThrow("Requisição falhou com status 404.")
    })
})

describe("post", () => {
    it("serializa o corpo enviado e informa o Content-Type", async () => {
        const fetchMock = mockFetch({ ok: true, json: async () => ({ id: "1" }) })

        await post("/api/example", { name: "Exemplo" })

        expect(fetchMock).toHaveBeenCalledWith("/api/example", {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json"
            },
            body: '{"name":"Exemplo"}'
        })
    })

    it("lança um erro com o status quando a resposta não é ok", async () => {
        mockFetch({ ok: false, status: 500, json: async () => ({}) })

        await expect(post("/api/example", {})).rejects.toThrow("Requisição falhou com status 500.")
    })
})
