import { afterEach, describe, expect, it, vi } from "vitest"

const user = {
    id: 1,
    name: "Ana Paula Souza",
    email: "ana@exemplo.gov.br",
    isAdmin: true,
    permissions: ["sessions.view", "outra.chave"]
}

function jsonResponse(status: number, body?: unknown): Response {
    return new Response(body === undefined ? null : JSON.stringify(body), { status })
}

async function setup() {
    vi.stubEnv("VITE_API_URL", "http://api.test")
    vi.resetModules()
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const { default: fetchCurrentAccount } = await import("@/services/auth/fetchCurrentAccount")

    return { fetchCurrentAccount, fetchMock }
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("fetchCurrentAccount", () => {
    it("chama GET /api/v1/auth/me com o sinal e devolve a conta mapeada", async () => {
        const { fetchCurrentAccount, fetchMock } = await setup()
        fetchMock.mockResolvedValue(jsonResponse(200, { data: user }))
        const controller = new AbortController()

        const account = await fetchCurrentAccount(controller.signal)

        expect(fetchMock).toHaveBeenCalledWith(
            "http://api.test/api/v1/auth/me",
            expect.objectContaining({ method: "GET", signal: controller.signal })
        )
        expect(account).toEqual({ ...user, permissions: ["sessions.view"] })
    })

    it("renova a sessão no 401 e repete o /me", async () => {
        const { fetchCurrentAccount, fetchMock } = await setup()
        fetchMock
            .mockResolvedValueOnce(jsonResponse(401))
            .mockResolvedValueOnce(jsonResponse(204))
            .mockResolvedValueOnce(jsonResponse(200, { data: user }))

        const account = await fetchCurrentAccount()

        expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
            "http://api.test/api/v1/auth/me",
            "http://api.test/api/v1/auth/refresh",
            "http://api.test/api/v1/auth/me"
        ])
        expect(account.id).toBe(1)
    })
})
