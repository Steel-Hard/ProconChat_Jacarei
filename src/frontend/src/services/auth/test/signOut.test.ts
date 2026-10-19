import { afterEach, describe, expect, it, vi } from "vitest"

async function setup() {
    vi.stubEnv("VITE_API_URL", "http://api.test")
    vi.resetModules()
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const { default: signOut } = await import("@/services/auth/signOut")
    const { default: onUnauthorized } = await import("@/services/http/onUnauthorized")

    return { signOut, onUnauthorized, fetchMock }
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("signOut", () => {
    it("envia POST /api/v1/auth/logout sem corpo e sem renovar a sessão no 401", async () => {
        const { signOut, onUnauthorized, fetchMock } = await setup()
        const handler = vi.fn()
        onUnauthorized(handler)
        fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

        await signOut()

        expect(fetchMock).toHaveBeenCalledWith(
            "http://api.test/api/v1/auth/logout",
            expect.objectContaining({ method: "POST", body: undefined })
        )

        fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }))
        await expect(signOut()).rejects.toMatchObject({ status: 401 })
        expect(fetchMock).toHaveBeenCalledTimes(2)
        expect(handler).not.toHaveBeenCalled()
    })
})
