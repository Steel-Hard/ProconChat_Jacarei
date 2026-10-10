import { afterEach, describe, expect, it, vi } from "vitest"
import get from "@/services/http/get"

afterEach(() => {
    vi.unstubAllGlobals()
})

describe("get", () => {
    it("envia o método GET e devolve o corpo da resposta", async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })))
        vi.stubGlobal("fetch", fetchMock)

        await expect(get("/x")).resolves.toEqual({ ok: true })

        expect(fetchMock.mock.calls[0][1].method).toBe("GET")
        expect(fetchMock.mock.calls[0][1].body).toBeUndefined()
    })
})
