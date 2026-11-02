import express from "express"
import request from "supertest"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import app from "../app"
import { backendClient } from "../clients/backend.client"
import { createCloudApiProvider } from "../gateways/cloudApi.gateway"
import errorHandler from "../middleware/errorHandler.middleware"
import { createPhoneQueue, PhoneQueue, whatsappPhoneQueue } from "../services/phoneQueue"
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

describe("POST /internal/whatsapp/messages/text", () => {
    const TEXT_PATH = "/internal/whatsapp/messages/text"
    const textBody = { to: "5512999990000", text: "Explicação complementar\n\nGerado com auxílio de IA" }

    function buildTextApp({
        providerSend = vi.fn().mockResolvedValue(undefined),
        load = vi.fn().mockResolvedValue(config),
        queue = createPhoneQueue(),
    }: {
        providerSend?: ReturnType<typeof vi.fn>
        load?: ReturnType<typeof vi.fn>
        queue?: PhoneQueue
    } = {}) {
        const provider = { sendTemplate: vi.fn(), send: providerSend }
        const logger = { log: vi.fn() }
        const testApp = express()
        testApp.use(express.json())
        testApp.use(
            "/internal/whatsapp/messages",
            new InternalMessagesRoutes({ config: { load }, provider, logger, queue }).getRouter(),
        )
        testApp.use(errorHandler)
        return { testApp, providerSend, load, logger }
    }

    function sendText(testApp: express.Express, payload: unknown = textBody) {
        return request(testApp).post(TEXT_PATH).set("X-Internal-Token", TOKEN).send(payload as object)
    }

    afterEach(() => {
        vi.restoreAllMocks()
    })

    test.each([
        { label: "sem o token interno", token: undefined },
        { label: "com o token interno errado", token: "token-errado" },
    ])("recusa $label e não chama o provedor", async ({ token }) => {
        const { testApp, providerSend } = buildTextApp()
        const pending = request(testApp).post(TEXT_PATH)

        const response = await (token === undefined ? pending : pending.set("X-Internal-Token", token)).send(textBody)

        expect(response.status).toBe(401)
        expect(response.body).toEqual({ error: { code: "UNAUTHORIZED", message: "Invalid internal token" } })
        expect(providerSend).not.toHaveBeenCalled()
    })

    test.each([
        { label: "o destinatário é inválido", payload: { ...textBody, to: "+5512999990000" }, reason: "invalid_to" },
        { label: "o texto só tem espaços", payload: { ...textBody, text: "   " }, reason: "invalid_text" },
        { label: "o texto passa de 4096 caracteres", payload: { ...textBody, text: "a".repeat(4097) }, reason: "invalid_text" },
    ])("responde 400 e não chama o provedor quando $label", async ({ payload, reason }) => {
        const { testApp, providerSend } = buildTextApp()

        const response = await sendText(testApp, payload)

        expect(response.status).toBe(400)
        expect(response.body).toEqual({ error: { code: "BAD_REQUEST", message: `Invalid text message: ${reason}` } })
        expect(providerSend).not.toHaveBeenCalled()
    })

    test("carrega a configuração, envia o texto ao provedor e responde 200", async () => {
        const { testApp, providerSend, load } = buildTextApp()

        const response = await sendText(testApp)

        expect(response.status).toBe(200)
        expect(response.body).toEqual({ data: { sent: true } })
        expect(load).toHaveBeenCalledOnce()
        expect(providerSend).toHaveBeenCalledExactlyOnceWith(textBody.to, { type: "text", text: textBody.text })
        expect(load.mock.invocationCallOrder[0]).toBeLessThan(providerSend.mock.invocationCallOrder[0] as number)
    })

    test("aceita texto com 4096 caracteres", async () => {
        const text = "a".repeat(4096)
        const { testApp, providerSend } = buildTextApp()

        const response = await sendText(testApp, { ...textBody, text })

        expect(response.status).toBe(200)
        expect(providerSend).toHaveBeenCalledExactlyOnceWith(textBody.to, { type: "text", text })
    })

    test("só envia depois que termina a tarefa em andamento na fila do mesmo telefone", async () => {
        const realQueue = createPhoneQueue()
        let entered!: () => void
        const routeEntered = new Promise<void>((resolve) => {
            entered = resolve
        })
        const calls: string[] = []
        const queue: PhoneQueue = {
            run(phone, task) {
                calls.push(`run:${phone}`)
                if (calls.length === 2) {
                    entered()
                }
                return realQueue.run(phone, task)
            },
            size: () => realQueue.size(),
        }
        let releaseBlocker!: () => void
        const blocker = queue.run(textBody.to, async () => {
            await new Promise<void>((resolve) => {
                releaseBlocker = resolve
            })
            calls.push("blocker:done")
        })
        const providerSend = vi.fn(async () => {
            calls.push("send")
        })
        const { testApp } = buildTextApp({ providerSend, queue })

        const responsePromise = sendText(testApp).then((response) => response)
        await Promise.race([routeEntered, responsePromise])
        await new Promise((resolve) => setImmediate(resolve))
        const sentBeforeRelease = providerSend.mock.calls.length
        releaseBlocker()
        await blocker
        const response = await responsePromise

        expect(sentBeforeRelease).toBe(0)
        expect(response.status).toBe(200)
        expect(calls).toEqual([`run:${textBody.to}`, `run:${textBody.to}`, "blocker:done", "send"])
    })

    test("na montagem padrão só envia depois da tarefa em andamento na fila compartilhada com o webhook", async () => {
        const to = "5512999990077"
        const events: string[] = []
        let releaseBlocker!: () => void
        const blocker = whatsappPhoneQueue.run(
            to,
            () =>
                new Promise<void>((resolve) => {
                    releaseBlocker = () => {
                        events.push("blocker:done")
                        resolve()
                    }
                }),
        )
        const providerSend = vi.fn(async () => {
            events.push("send")
        })
        const load = vi.fn().mockResolvedValue(config)
        const provider = { sendTemplate: vi.fn(), send: providerSend }
        const testApp = express()
        testApp.use(express.json())
        testApp.use(
            "/internal/whatsapp/messages",
            new InternalMessagesRoutes({ config: { load }, provider, logger: { log: vi.fn() } }).getRouter(),
        )
        testApp.use(errorHandler)

        const responsePromise = sendText(testApp, { ...textBody, to }).then((response) => response)
        try {
            await vi.waitFor(() => expect(load).toHaveBeenCalled())
            for (let tick = 0; tick < 5; tick++) {
                await new Promise((resolve) => setImmediate(resolve))
            }
            expect(providerSend).not.toHaveBeenCalled()
        } finally {
            releaseBlocker()
        }
        await blocker
        const response = await responsePromise

        expect(response.status).toBe(200)
        expect(events).toEqual(["blocker:done", "send"])
    })

    test("responde 502 PROVIDER_ERROR sem registrar o telefone nem o texto quando o provedor falha", async () => {
        const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined)
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)
        const providerSend = vi.fn().mockRejectedValue(new Error(`falha para ${textBody.to}: ${textBody.text}`))
        const { testApp, logger } = buildTextApp({ providerSend })

        const response = await sendText(testApp)

        expect(response.status).toBe(502)
        expect(response.body).toEqual({
            error: { code: "PROVIDER_ERROR", message: "WhatsApp provider did not accept the message" },
        })
        expect(logger.log).toHaveBeenCalledOnce()
        const logged = JSON.stringify([logger.log.mock.calls, consoleLog.mock.calls, consoleError.mock.calls])
        expect(logged).not.toContain(textBody.to)
        expect(logged).not.toContain("Explicação complementar")
    })
})
