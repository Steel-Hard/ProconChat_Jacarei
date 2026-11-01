import express from "express"
import request from "supertest"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import app from "../app"
import { backendClient } from "../clients/backend.client"
import { createCloudApiProvider } from "../gateways/cloudApi.gateway"
import errorHandler from "../middleware/errorHandler.middleware"
import { createWhatsAppConfigStore } from "../services/whatsappConfigStore"
import { InternalMessagesRoutes } from "./internalMessages.routes"

vi.mock("../clients/backend.client", () => ({
    backendClient: { createWhatsappSession: vi.fn(), getWhatsappConfig: vi.fn(), reportWebhookEvents: vi.fn() },
}))

const PATH = "/internal/whatsapp/messages/template"
const TOKEN = process.env.GATEWAY_INTERNAL_TOKEN as string
const config = {
    phoneNumberId: "100000000000001",
    accessToken: "token-do-banco",
    appSecret: "segredo-do-banco",
    verifyToken: "verify-token-do-banco",
    graphApiVersion: "v26.0",
}
const body = {
    to: "5512999990000",
    name: "aviso_cancelamento",
    languageCode: "pt_BR",
    bodyParameters: ["Maria", "1A2B3C4D", "05/11", "14:00", "a unidade estará fechada nesta data"],
}

function buildApp({
    fetchFn = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({ messages: [{ id: "wamid.X" }] }) }),
    getWhatsappConfig = vi.fn().mockResolvedValue(config),
    logger = { log: vi.fn() },
}: {
    fetchFn?: ReturnType<typeof vi.fn>
    getWhatsappConfig?: ReturnType<typeof vi.fn>
    logger?: { log: ReturnType<typeof vi.fn> }
} = {}) {
    const store = createWhatsAppConfigStore({ backend: { getWhatsappConfig }, logger })
    const provider = createCloudApiProvider({ getConfig: () => store.current(), fetchFn })
    const testApp = express()
    testApp.use(express.json())
    testApp.use("/internal/whatsapp/messages", new InternalMessagesRoutes({ config: store, provider, logger }).getRouter())
    testApp.use(errorHandler)
    return { testApp, fetchFn, getWhatsappConfig, logger }
}

function send(testApp: express.Express, payload: unknown = body) {
    return request(testApp).post(PATH).set("X-Internal-Token", TOKEN).send(payload as object)
}

describe("POST /internal/whatsapp/messages/template", () => {
    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(backendClient.getWhatsappConfig).mockResolvedValue(config)
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test("recusa sem o token interno e não chama a Meta", async () => {
        const fetchSpy = vi.spyOn(globalThis, "fetch")

        const response = await request(app).post(PATH).send(body)

        expect(response.status).toBe(401)
        expect(response.body).toEqual({ error: { code: "UNAUTHORIZED", message: "Invalid internal token" } })
        expect(fetchSpy).not.toHaveBeenCalled()
    })

    test("recusa com o token interno errado e não chama a Meta", async () => {
        const { testApp, fetchFn } = buildApp()

        const response = await request(testApp).post(PATH).set("X-Internal-Token", "token-errado").send(body)

        expect(response.status).toBe(401)
        expect(response.body).toEqual({ error: { code: "UNAUTHORIZED", message: "Invalid internal token" } })
        expect(fetchFn).not.toHaveBeenCalled()
    })

    test("responde 200 com o id da mensagem devolvido pela Meta", async () => {
        const { testApp } = buildApp()

        const response = await send(testApp)

        expect(response.status).toBe(200)
        expect(response.body).toEqual({ data: { providerMessageId: "wamid.X" } })
    })

    test("responde 200 com providerMessageId nulo quando a Meta não devolve messages", async () => {
        const { testApp } = buildApp({ fetchFn: vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) }) })

        const response = await send(testApp)

        expect(response.status).toBe(200)
        expect(response.body).toEqual({ data: { providerMessageId: null } })
    })

    test.each([
        { label: "a Meta responde 400", fetchFn: () => vi.fn().mockResolvedValue({ ok: false, status: 400, json: () => Promise.resolve({}) }) },
        { label: "a rede falha", fetchFn: () => vi.fn().mockRejectedValue(new TypeError("fetch failed")) },
    ])("responde 502 PROVIDER_ERROR quando $label", async ({ fetchFn }) => {
        const { testApp } = buildApp({ fetchFn: fetchFn() })

        const response = await send(testApp)

        expect(response.status).toBe(502)
        expect(response.body).toEqual({
            error: { code: "PROVIDER_ERROR", message: "WhatsApp provider did not accept the message" },
        })
    })

    test("com o cache frio, carrega a configuração antes de enviar", async () => {
        const { testApp, fetchFn, getWhatsappConfig } = buildApp()

        const response = await send(testApp)

        expect(response.status).toBe(200)
        expect(getWhatsappConfig).toHaveBeenCalledOnce()
        expect(getWhatsappConfig.mock.invocationCallOrder[0]).toBeLessThan(fetchFn.mock.invocationCallOrder[0] as number)
        expect(fetchFn.mock.calls[0]?.[0]).toBe("https://graph.facebook.com/v26.0/100000000000001/messages")
    })

    test("responde 503 e não chama a Meta quando não consegue carregar a configuração", async () => {
        const { testApp, fetchFn } = buildApp({ getWhatsappConfig: vi.fn().mockRejectedValue(new Error("backend fora")) })

        const response = await send(testApp)

        expect(response.status).toBe(503)
        expect(response.body).toEqual({ error: { code: "SERVICE_UNAVAILABLE", message: "WhatsApp configuration is unavailable" } })
        expect(fetchFn).not.toHaveBeenCalled()
    })

    test("responde 400 e não chama a Meta quando o corpo é inválido", async () => {
        const { testApp, fetchFn } = buildApp()

        const response = await send(testApp, { ...body, to: "1234567" })

        expect(response.status).toBe(400)
        expect(response.body).toEqual({ error: { code: "BAD_REQUEST", message: "Invalid template message: invalid_to" } })
        expect(fetchFn).not.toHaveBeenCalled()
    })

    test("não registra o telefone do destinatário em log no caminho de erro", async () => {
        const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined)
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)
        const { testApp, logger } = buildApp({ fetchFn: vi.fn().mockRejectedValue(new Error(`falha para ${body.to}`)) })

        const response = await send(testApp)

        expect(response.status).toBe(502)
        expect(logger.log).toHaveBeenCalledOnce()
        const logged = JSON.stringify([logger.log.mock.calls, consoleLog.mock.calls, consoleError.mock.calls])
        expect(logged).not.toContain(body.to)
    })
})
