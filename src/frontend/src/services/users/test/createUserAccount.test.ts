import { afterEach, describe, expect, it, vi } from "vitest"

const INPUT = { name: "Bruno Lima", email: "bruno@exemplo.gov.br", password: "senha-inicial" }

function jsonResponse(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), { status })
}

async function setup() {
    vi.stubEnv("VITE_API_URL", "http://api.test")
    vi.resetModules()
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const { default: createUserAccount } = await import("@/services/users/createUserAccount")

    return { createUserAccount, fetchMock }
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("createUserAccount", () => {
    it("envia POST /api/v1/users só com nome, e-mail e senha e devolve a conta do envelope", async () => {
        const { createUserAccount, fetchMock } = await setup()
        const account = { id: 9, name: "Bruno Lima" }
        fetchMock.mockResolvedValue(jsonResponse(201, { data: account }))

        const result = await createUserAccount(INPUT)

        expect(result).toEqual(account)
        expect(fetchMock).toHaveBeenCalledWith(
            "http://api.test/api/v1/users",
            expect.objectContaining({
                method: "POST",
                credentials: "include",
                body: JSON.stringify(INPUT)
            })
        )
    })

    it("rejeita o 409 com HttpError e o code EMAIL_ALREADY_IN_USE", async () => {
        const { createUserAccount, fetchMock } = await setup()
        fetchMock.mockResolvedValue(
            jsonResponse(409, { error: { code: "EMAIL_ALREADY_IN_USE", message: "x" } })
        )

        await expect(createUserAccount(INPUT)).rejects.toMatchObject({
            name: "HttpError",
            status: 409,
            code: "EMAIL_ALREADY_IN_USE"
        })
    })
})
