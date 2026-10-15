import { afterEach, describe, expect, it, vi } from "vitest"

function jsonResponse(status: number, body?: unknown): Response {
    return new Response(body === undefined ? null : JSON.stringify(body), { status })
}

async function setup() {
    vi.stubEnv("VITE_API_URL", "http://api.test")
    vi.resetModules()
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const { default: changePassword } = await import("@/services/auth/changePassword")
    const { default: onUnauthorized } = await import("@/services/http/onUnauthorized")

    return { changePassword, onUnauthorized, fetchMock }
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("changePassword", () => {
    it("envia POST /api/v1/auth/change-password com a senha atual e a nova", async () => {
        const { changePassword, fetchMock } = await setup()
        fetchMock.mockResolvedValue(jsonResponse(200, { data: { changed: true } }))

        await changePassword("atual-123", "nova-senha-123")

        expect(fetchMock).toHaveBeenCalledWith(
            "http://api.test/api/v1/auth/change-password",
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({
                    currentPassword: "atual-123",
                    newPassword: "nova-senha-123"
                })
            })
        )
    })

    it("rejeita o 400 INVALID_CURRENT_PASSWORD com o código, sem chamar onUnauthorized", async () => {
        const { changePassword, onUnauthorized, fetchMock } = await setup()
        const handler = vi.fn()
        onUnauthorized(handler)
        fetchMock.mockResolvedValue(
            jsonResponse(400, {
                error: { code: "INVALID_CURRENT_PASSWORD", message: "Current password is invalid" }
            })
        )

        await expect(changePassword("errada", "nova-senha-123")).rejects.toMatchObject({
            status: 400,
            code: "INVALID_CURRENT_PASSWORD"
        })

        expect(handler).not.toHaveBeenCalled()
    })
})
