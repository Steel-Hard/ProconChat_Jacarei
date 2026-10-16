import { afterEach, describe, expect, it, vi } from "vitest"

const INPUT = {
    phoneNumberId: "100000000000001",
    businessAccountId: "200000000000002",
    accessToken: null,
    appSecret: "segredo-novo-ficticio"
}

function jsonResponse(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), { status })
}

async function setup() {
    vi.stubEnv("VITE_API_URL", "http://api.test")
    vi.resetModules()
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    const { default: saveWhatsAppSettings } =
        await import("@/services/whatsapp/saveWhatsAppSettings")

    return { saveWhatsAppSettings, fetchMock }
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
    vi.resetModules()
})

describe("saveWhatsAppSettings", () => {
    it("envia PUT /api/v1/whatsapp/settings com o corpo e devolve a leitura do envelope", async () => {
        const { saveWhatsAppSettings, fetchMock } = await setup()
        const view = { phoneNumberId: "100000000000001", autoReplyPaused: false }
        fetchMock.mockResolvedValue(jsonResponse(200, { data: view }))

        const result = await saveWhatsAppSettings(INPUT)

        expect(result).toEqual(view)
        expect(fetchMock).toHaveBeenCalledWith(
            "http://api.test/api/v1/whatsapp/settings",
            expect.objectContaining({
                method: "PUT",
                credentials: "include",
                body: JSON.stringify(INPUT)
            })
        )
    })

    it("rejeita o 422 com HttpError e o code igual ao motivo da Meta", async () => {
        const { saveWhatsAppSettings, fetchMock } = await setup()
        fetchMock.mockResolvedValue(
            jsonResponse(422, {
                error: { code: "INVALID_TOKEN", message: "WhatsApp connection test failed" }
            })
        )

        await expect(saveWhatsAppSettings(INPUT)).rejects.toMatchObject({
            name: "HttpError",
            status: 422,
            code: "INVALID_TOKEN"
        })
    })
})
