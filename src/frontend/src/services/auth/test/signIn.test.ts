import { afterEach, describe, expect, it, vi } from "vitest"

const user = {
    id: 5,
    name: "Bruno Lima",
    email: "bruno@exemplo.gov.br",
    isAdmin: false,
    permissions: ["sessions.view"]
}

function jsonResponse(status: number, body?: unknown): Response {
    return new Response(body === undefined ? null : JSON.stringify(body), { status })
}

async function setup() {
    vi.stubEnv("VITE_API_URL", "http://api.test")
    vi.resetModules()
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const { default: signIn } = await import("@/services/auth/signIn")
    const { default: onUnauthorized } = await import("@/services/http/onUnauthorized")

    return { signIn, onUnauthorized, fetchMock }
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("signIn", () => {
    it("envia POST /api/v1/auth/login com e-mail e senha", async () => {
        const { signIn, fetchMock } = await setup()
        fetchMock.mockResolvedValue(jsonResponse(200, { data: { user } }))

        await signIn(" bruno@exemplo.gov.br ", "senha-segura")

        expect(fetchMock).toHaveBeenCalledWith(
            "http://api.test/api/v1/auth/login",
            expect.objectContaining({
                method: "POST",
                credentials: "include",
                body: JSON.stringify({
                    email: " bruno@exemplo.gov.br ",
                    password: "senha-segura"
                })
            })
        )
    })

    it("rejeita o 401 sem renovar a sessão nem chamar onUnauthorized", async () => {
        const { signIn, onUnauthorized, fetchMock } = await setup()
        const handler = vi.fn()
        onUnauthorized(handler)
        fetchMock.mockResolvedValue(
            jsonResponse(401, { error: { code: "UNAUTHORIZED", message: "Invalid credentials" } })
        )

        await expect(signIn("bruno@exemplo.gov.br", "errada")).rejects.toMatchObject({
            status: 401
        })

        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect(handler).not.toHaveBeenCalled()
    })

    it("devolve a conta do usuário logado", async () => {
        const { signIn, fetchMock } = await setup()
        fetchMock.mockResolvedValue(jsonResponse(200, { data: { user } }))

        await expect(signIn("bruno@exemplo.gov.br", "senha-segura")).resolves.toEqual(user)
    })
})
