import { afterEach, describe, expect, it, vi } from "vitest"
import patch from "@/services/http/patch"

afterEach(() => {
    vi.unstubAllGlobals()
})

describe("patch", () => {
    it("envia o método PATCH e devolve o corpo da resposta", async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })))
        vi.stubGlobal("fetch", fetchMock)

        await expect(patch("/x", { a: 1 })).resolves.toEqual({ ok: true })

        expect(fetchMock.mock.calls[0][1].method).toBe("PATCH")
        expect(fetchMock.mock.calls[0][1].body).toBe('{"a":1}')
    })
})
