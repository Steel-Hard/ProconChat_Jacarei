import { afterEach, describe, expect, it, vi } from "vitest"

const INPUT = {
    phoneNumberId: "100000000000001",
    businessAccountId: "200000000000002",
    accessToken: "EAAG-token-novo-ficticio-77Zz",
    appSecret: null
}

function jsonResponse(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), { status })
}

async function setup() {
    vi.stubEnv("VITE_API_URL", "http://api.test")
    vi.resetModules()
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const { default: testWhatsAppConnection } =
        await import("@/services/whatsapp/testWhatsAppConnection")

    return { testWhatsAppConnection, fetchMock }
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("testWhatsAppConnection", () => {
    it("envia POST /api/v1/whatsapp/settings/test com o corpo e as credenciais do cookie", async () => {
        const { testWhatsAppConnection, fetchMock } = await setup()
        fetchMock.mockResolvedValue(
            jsonResponse(200, { data: { ok: false, reason: "INVALID_TOKEN", checkedAt: "x" } })
        )

        await testWhatsAppConnection(INPUT)

        expect(fetchMock).toHaveBeenCalledWith(
            "http://api.test/api/v1/whatsapp/settings/test",
            expect.objectContaining({
                method: "POST",
                credentials: "include",
                body: JSON.stringify(INPUT)
            })
        )
    })

    it("devolve o data do envelope com o resultado do teste", async () => {
        const { testWhatsAppConnection, fetchMock } = await setup()
        const result = {
            ok: true,
            displayPhoneNumber: "+55 12 3955-9000",
            verifiedName: "PROCON Jacareí",
            checkedAt: "2026-10-14T13:00:00.000Z"
        }
        fetchMock.mockResolvedValue(jsonResponse(200, { data: result }))

        await expect(testWhatsAppConnection(INPUT)).resolves.toEqual(result)
    })

    it("rejeita o 400 com HttpError", async () => {
        const { testWhatsAppConnection, fetchMock } = await setup()
        fetchMock.mockResolvedValue(
            jsonResponse(400, { error: { code: "BAD_REQUEST", message: "x" } })
        )

        await expect(testWhatsAppConnection(INPUT)).rejects.toMatchObject({
            name: "HttpError",
            status: 400,
            code: "BAD_REQUEST"
        })
    })
})
