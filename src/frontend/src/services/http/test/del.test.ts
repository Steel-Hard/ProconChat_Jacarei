import { afterEach, describe, expect, it, vi } from "vitest"
import del from "@/services/http/del"

afterEach(() => {
    vi.unstubAllGlobals()
})

describe("del", () => {
    it("envia o método DELETE e devolve o corpo da resposta", async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })))
        vi.stubGlobal("fetch", fetchMock)

        await expect(del("/x")).resolves.toEqual({ ok: true })

        expect(fetchMock.mock.calls[0][1].method).toBe("DELETE")
        expect(fetchMock.mock.calls[0][1].body).toBeUndefined()
    })
})
