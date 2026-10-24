import { afterEach, describe, expect, it, vi } from "vitest"

function jsonResponse(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), { status })
}

async function setup() {
    vi.stubEnv("VITE_API_URL", "http://api.test")
    vi.resetModules()
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const { default: resetUserPassword } = await import("@/services/users/resetUserPassword")

    return { resetUserPassword, fetchMock }
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("resetUserPassword", () => {
    it("envia POST /api/v1/users/:id/reset-password só com a senha", async () => {
        const { resetUserPassword, fetchMock } = await setup()
        fetchMock.mockResolvedValue(jsonResponse(200, { data: { reset: true } }))

        await resetUserPassword(7, "senha-nova-1")

        expect(fetchMock).toHaveBeenCalledWith(
            "http://api.test/api/v1/users/7/reset-password",
            expect.objectContaining({
                method: "POST",
                credentials: "include",
                body: JSON.stringify({ password: "senha-nova-1" })
            })
        )
    })

    it("rejeita o 403 com HttpError e o code da regra", async () => {
        const { resetUserPassword, fetchMock } = await setup()
        fetchMock.mockResolvedValue(
            jsonResponse(403, { error: { code: "TARGET_HAS_MORE_PERMISSIONS", message: "x" } })
        )

        await expect(resetUserPassword(7, "senha-nova-1")).rejects.toMatchObject({
            name: "HttpError",
            status: 403,
            code: "TARGET_HAS_MORE_PERMISSIONS"
        })
    })
})
