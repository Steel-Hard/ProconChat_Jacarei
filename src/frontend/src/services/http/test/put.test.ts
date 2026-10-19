import { afterEach, describe, expect, it, vi } from "vitest"
import put from "@/services/http/put"

afterEach(() => {
    vi.unstubAllGlobals()
})

describe("put", () => {
    it("envia o método PUT e devolve o corpo da resposta", async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })))
        vi.stubGlobal("fetch", fetchMock)

        await expect(put("/x", { a: 1 })).resolves.toEqual({ ok: true })

        expect(fetchMock.mock.calls[0][1].method).toBe("PUT")
        expect(fetchMock.mock.calls[0][1].body).toBe('{"a":1}')
    })
})
