import { afterEach, describe, expect, it, vi } from "vitest"

async function setup() {
    vi.stubEnv("VITE_API_URL", "http://api.test")
    vi.resetModules()
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const { default: refreshSession } = await import("@/services/http/refreshSession")

    return { refreshSession, fetchMock }
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("refreshSession", () => {
    it("devolve true quando o refresh responde 204", async () => {
        const { refreshSession, fetchMock } = await setup()
        fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

        await expect(refreshSession()).resolves.toBe(true)

        expect(fetchMock).toHaveBeenCalledWith(
            "http://api.test/api/v1/auth/refresh",
            expect.objectContaining({ method: "POST", credentials: "include" })
        )
        expect(fetchMock.mock.calls[0][1].headers["Accept-Language"]).toBe("pt-BR")
        expect(fetchMock.mock.calls[0][1].body).toBeUndefined()
    })

    it("devolve false quando o refresh responde 401", async () => {
        const { refreshSession, fetchMock } = await setup()
        fetchMock.mockResolvedValue(new Response(null, { status: 401 }))

        await expect(refreshSession()).resolves.toBe(false)
    })

    it("devolve false quando o refresh falha por rede", async () => {
        const { refreshSession, fetchMock } = await setup()
        fetchMock.mockRejectedValue(new TypeError("Failed to fetch"))

        await expect(refreshSession()).resolves.toBe(false)
    })

    it("compartilha a mesma promessa entre chamadas simultâneas e libera no fim", async () => {
        const { refreshSession, fetchMock } = await setup()
        const response = Promise.withResolvers<Response>()
        fetchMock.mockReturnValueOnce(response.promise)

        const first = refreshSession()
        const second = refreshSession()
        response.resolve(new Response(null, { status: 204 }))

        await expect(Promise.all([first, second])).resolves.toEqual([true, true])
        expect(fetchMock).toHaveBeenCalledTimes(1)

        fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }))
        await expect(refreshSession()).resolves.toBe(false)
        expect(fetchMock).toHaveBeenCalledTimes(2)
    })
})
