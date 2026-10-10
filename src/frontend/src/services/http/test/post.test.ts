import { afterEach, describe, expect, it, vi } from "vitest"
import post from "@/services/http/post"

afterEach(() => {
    vi.unstubAllGlobals()
})

describe("post", () => {
    it("envia o método POST e devolve o corpo da resposta", async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })))
        vi.stubGlobal("fetch", fetchMock)

        await expect(post("/x", { a: 1 })).resolves.toEqual({ ok: true })

        expect(fetchMock.mock.calls[0][1].method).toBe("POST")
        expect(fetchMock.mock.calls[0][1].body).toBe('{"a":1}')
    })
})
