import { afterEach, describe, expect, test, vi } from "vitest"
import { backendClient } from "./backend.client"

describe("Backend client", () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        delete process.env.BACKEND_INTERNAL_URL
        delete process.env.GATEWAY_INTERNAL_TOKEN
    })

    test("chama o endpoint interno com o token e devolve os dados da sessao", async () => {
        process.env.BACKEND_INTERNAL_URL = "http://backend:3000/"
        process.env.GATEWAY_INTERNAL_TOKEN = "test-internal-token"
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 202,
            json: () => Promise.resolve({ data: { sessionId: "42", newSession: true } }),
        })
        vi.stubGlobal("fetch", fetchMock)

        await expect(
            backendClient.createWhatsappSession({ phone: "5511999999999" }),
        ).resolves.toEqual({ sessionId: "42", newSession: true })

        expect(fetchMock.mock.calls[0]?.[0]).toBe("http://backend:3000/api/v1/whatsapp/sessions")
        expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Internal-Token": "test-internal-token",
            },
            body: JSON.stringify({ phone: "5511999999999" }),
        })
    })

    test("falha quando o backend interno nao esta configurado", async () => {
        await expect(
            backendClient.createWhatsappSession({ phone: "5511999999999" }),
        ).rejects.toThrow("Backend internal client is not configured")
    })

    test("propaga resposta HTTP sem sucesso", async () => {
        process.env.BACKEND_INTERNAL_URL = "http://backend:3000"
        process.env.GATEWAY_INTERNAL_TOKEN = "test-internal-token"
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }))

        await expect(
            backendClient.createWhatsappSession({ phone: "5511999999999" }),
        ).rejects.toThrow("Backend returned HTTP 401")
    })
})
