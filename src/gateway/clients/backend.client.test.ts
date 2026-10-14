import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
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

    test("envia optionId sem text quando o cidadao toca numa opcao", async () => {
        process.env.BACKEND_INTERNAL_URL = "http://backend:3000"
        process.env.GATEWAY_INTERNAL_TOKEN = "test-internal-token"
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 202,
            json: () => Promise.resolve({ data: { sessionId: "42", newSession: false } }),
        })
        vi.stubGlobal("fetch", fetchMock)

        await backendClient.createWhatsappSession({ phone: "5500000000001", optionId: "categoria-3" })

        const body = JSON.parse(fetchMock.mock.calls[0]?.[1].body as string)
        expect(body).toEqual({ phone: "5500000000001", optionId: "categoria-3" })
        expect(body).not.toHaveProperty("text")
    })

    test("devolve a resposta inteira com reply.messages", async () => {
        process.env.BACKEND_INTERNAL_URL = "http://backend:3000"
        process.env.GATEWAY_INTERNAL_TOKEN = "test-internal-token"
        const data = {
            sessionId: "42",
            newSession: false,
            reply: {
                text: "Escolha uma categoria",
                step: "AWAITING_CATEGORY",
                messages: [
                    {
                        type: "list",
                        text: "Escolha uma categoria",
                        buttonText: "Ver categorias",
                        rows: [{ id: "cat-1", title: "Bancos", description: "Tarifas" }],
                    },
                    { type: "buttons", text: "Resolveu?", buttons: [{ id: "sim", title: "Sim" }] },
                ],
            },
        }
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({ ok: true, status: 202, json: () => Promise.resolve({ data }) }),
        )

        const result = await backendClient.createWhatsappSession({ phone: "5500000000001", text: "oi" })

        expect(result).toEqual(data)
    })
})

describe("Backend client: configuracao do WhatsApp", () => {
    const config = {
        phoneNumberId: "100000000000001",
        accessToken: "EAAG-token-ficticio",
        appSecret: "segredo-ficticio-do-app",
        verifyToken: "verify-token-ficticio",
        graphApiVersion: "v26.0",
    }

    beforeEach(() => {
        process.env.BACKEND_INTERNAL_URL = "http://backend:3000/"
        process.env.GATEWAY_INTERNAL_TOKEN = "test-internal-token"
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        delete process.env.BACKEND_INTERNAL_URL
        delete process.env.GATEWAY_INTERNAL_TOKEN
    })

    test("busca a configuracao no endpoint interno com o token", async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ data: config }) })
        vi.stubGlobal("fetch", fetchMock)

        const result = await backendClient.getWhatsappConfig()

        expect(result).toEqual(config)
        expect(fetchMock.mock.calls[0]?.[0]).toBe("http://backend:3000/api/v1/internal/whatsapp/config")
        expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
            method: "GET",
            headers: { "X-Internal-Token": "test-internal-token" },
        })
        expect(fetchMock.mock.calls[0]?.[1].signal).toBeInstanceOf(AbortSignal)
    })

    test("troca por texto vazio os valores nulos da configuracao", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: () => Promise.resolve({ data: { ...config, phoneNumberId: null, accessToken: null, appSecret: null } }),
            }),
        )

        const result = await backendClient.getWhatsappConfig()

        expect(result).toEqual({ ...config, phoneNumberId: "", accessToken: "", appSecret: "" })
    })

    test("lanca sem o corpo da resposta quando o backend responde erro", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({ ok: false, status: 500, json: () => Promise.resolve({ segredo: "nao-mostrar" }) }),
        )

        const error = await backendClient.getWhatsappConfig().catch((caught: Error) => caught)

        expect(error).toEqual(new Error("Backend returned HTTP 500"))
    })

    test.each([
        { data: { ...config, verifyToken: "" } },
        { data: { ...config, appSecret: 123 } },
        { data: { ...config, graphApiVersion: undefined } },
        { data: null },
        "nao-e-objeto",
    ])("lanca quando a configuracao vem malformada (%o)", async (body) => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve(body) }))

        await expect(backendClient.getWhatsappConfig()).rejects.toThrow("Backend returned an invalid WhatsApp config")
    })
})
