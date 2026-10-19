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

    it("chama onUnauthorized e rejeita o 401 quando a renovação da sessão falha", async () => {
        const { changePassword, onUnauthorized, fetchMock } = await setup()
        const handler = vi.fn()
        onUnauthorized(handler)
        fetchMock.mockResolvedValue(
            jsonResponse(401, { error: { code: "UNAUTHORIZED", message: "x" } })
        )

        await expect(changePassword("atual-123", "nova-senha-123")).rejects.toMatchObject({
            status: 401
        })

        expect(handler).toHaveBeenCalledTimes(1)
        expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it("renova a sessão no 401 e repete a troca de senha uma vez", async () => {
        const { changePassword, onUnauthorized, fetchMock } = await setup()
        const handler = vi.fn()
        onUnauthorized(handler)
        fetchMock
            .mockResolvedValueOnce(
                jsonResponse(401, { error: { code: "UNAUTHORIZED", message: "x" } })
            )
            .mockResolvedValueOnce(new Response(null, { status: 204 }))
            .mockResolvedValueOnce(jsonResponse(200, { data: { changed: true } }))

        await changePassword("atual-123", "nova-senha-123")

        expect(fetchMock).toHaveBeenCalledTimes(3)
        expect(fetchMock.mock.calls[1][0]).toBe("http://api.test/api/v1/auth/refresh")
        expect(fetchMock.mock.calls[2][0]).toBe("http://api.test/api/v1/auth/change-password")
        expect(handler).not.toHaveBeenCalled()
    })
})
