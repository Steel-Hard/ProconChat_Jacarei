import { afterEach, describe, expect, it, vi } from "vitest"
import { createGatewayClient, GatewayFetchFn, GATEWAY_SEND_TIMEOUT_MS } from "./gateway.client"

const env = { GATEWAY_INTERNAL_URL: "http://gateway:3001/", GATEWAY_INTERNAL_TOKEN: "token-interno-ficticio" }

function logged(logger: { log: ReturnType<typeof vi.fn> }): string {
    return logger.log.mock.calls.map((call) => call.map(String).join(" ")).join("\n")
}

describe("gateway client", () => {
    it("avisa o gateway com o token interno e um tempo limite", async () => {
        const fetchFn = vi.fn<GatewayFetchFn>().mockResolvedValue({ ok: true, status: 204 })
        const logger = { log: vi.fn() }

        await createGatewayClient({ fetchFn, env, logger }).notifyConfigChanged()

        expect(fetchFn).toHaveBeenCalledTimes(1)
        const [url, init] = fetchFn.mock.calls[0] ?? []
        expect(url).toBe("http://gateway:3001/internal/whatsapp/config/reload")
        expect(init?.method).toBe("POST")
        expect(init?.headers).toEqual({ "X-Internal-Token": "token-interno-ficticio" })
        expect(init?.signal).toBeInstanceOf(AbortSignal)
        expect(logger.log).not.toHaveBeenCalled()
    })

    it.each([undefined, ""])("nao chama nada quando GATEWAY_INTERNAL_URL e %s", async (url) => {
        const fetchFn = vi.fn<GatewayFetchFn>()

        await createGatewayClient({ fetchFn, env: { ...env, GATEWAY_INTERNAL_URL: url }, logger: { log: vi.fn() } }).notifyConfigChanged()

        expect(fetchFn).not.toHaveBeenCalled()
    })

    it("nao lanca e loga o status quando o gateway responde 500", async () => {
        const fetchFn = vi.fn<GatewayFetchFn>().mockResolvedValue({ ok: false, status: 500 })
        const logger = { log: vi.fn() }

        await expect(createGatewayClient({ fetchFn, env, logger }).notifyConfigChanged()).resolves.toBeUndefined()

        expect(JSON.parse(String(logger.log.mock.calls[0]?.[0]))).toEqual({ event: "gateway_config_notify_failed", status: 500 })
    })

    it("nao lanca quando o gateway nao responde no tempo limite", async () => {
        const fetchFn = vi.fn<GatewayFetchFn>(
            (_url, init) =>
                new Promise((_resolve, reject) => {
                    init.signal?.addEventListener("abort", () => reject(init.signal?.reason))
                }),
        )
        const logger = { log: vi.fn() }

        await expect(createGatewayClient({ fetchFn, env, logger, timeoutMs: 5 }).notifyConfigChanged()).resolves.toBeUndefined()

        expect(JSON.parse(String(logger.log.mock.calls[0]?.[0]))).toEqual({ event: "gateway_config_notify_failed" })
    })

    it("nao registra o token interno no log", async () => {
        const fetchFn = vi.fn<GatewayFetchFn>().mockRejectedValue(new Error(`falhou com ${env.GATEWAY_INTERNAL_TOKEN}`))
        const logger = { log: vi.fn() }

        await createGatewayClient({ fetchFn, env, logger }).notifyConfigChanged()

        expect(logger.log).toHaveBeenCalledTimes(1)
        expect(logged(logger)).not.toContain(env.GATEWAY_INTERNAL_TOKEN)
    })
})

describe("gateway client: sendTemplate", () => {
    const input = {
        to: "5512999990000",
        name: "aviso_cancelamento",
        languageCode: "pt_BR",
        bodyParameters: ["Maria", "1A2B3C4D", "05/11", "14:00", "a unidade estará fechada nesta data"],
    }

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it.each([undefined, ""])("devolve NOT_CONFIGURED sem chamar o gateway quando GATEWAY_INTERNAL_URL é %s", async (url) => {
        const fetchFn = vi.fn<GatewayFetchFn>()

        const result = await createGatewayClient({ fetchFn, env: { ...env, GATEWAY_INTERNAL_URL: url }, logger: { log: vi.fn() } }).sendTemplate(input)

        expect(result).toEqual({ ok: false, reason: "NOT_CONFIGURED" })
        expect(fetchFn).not.toHaveBeenCalled()
    })

    it("usa um tempo limite de envio maior que os 10 s do gateway", async () => {
        const timeoutSpy = vi.spyOn(AbortSignal, "timeout")
        const fetchFn = vi.fn<GatewayFetchFn>().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) })

        await createGatewayClient({ fetchFn, env, logger: { log: vi.fn() } }).sendTemplate(input)

        expect(GATEWAY_SEND_TIMEOUT_MS).toBeGreaterThan(10_000)
        expect(timeoutSpy).toHaveBeenCalledWith(GATEWAY_SEND_TIMEOUT_MS)
        expect(fetchFn.mock.calls[0]?.[1].signal).toBe(timeoutSpy.mock.results[0]?.value)
    })

    it("envia o modelo ao gateway com o token interno, JSON e o corpo do contrato", async () => {
        const fetchFn = vi.fn<GatewayFetchFn>().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) })

        await createGatewayClient({ fetchFn, env, logger: { log: vi.fn() } }).sendTemplate(input)

        expect(fetchFn).toHaveBeenCalledTimes(1)
        const [url, init] = fetchFn.mock.calls[0] ?? []
        expect(url).toBe("http://gateway:3001/internal/whatsapp/messages/template")
        expect(init?.method).toBe("POST")
        expect(init?.headers).toEqual({ "X-Internal-Token": "token-interno-ficticio", "Content-Type": "application/json" })
        expect(JSON.parse(String(init?.body))).toEqual(input)
    })

    it("devolve ok com o id da mensagem quando o gateway responde 200", async () => {
        const fetchFn = vi.fn<GatewayFetchFn>().mockResolvedValue({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ data: { providerMessageId: "wamid.X" } }),
        })

        const result = await createGatewayClient({ fetchFn, env, logger: { log: vi.fn() } }).sendTemplate(input)

        expect(result).toEqual({ ok: true, providerMessageId: "wamid.X" })
    })

    it.each([400, 502, 503])("devolve REJECTED quando o gateway responde %s", async (status) => {
        const fetchFn = vi.fn<GatewayFetchFn>().mockResolvedValue({ ok: false, status })
        const logger = { log: vi.fn() }

        const result = await createGatewayClient({ fetchFn, env, logger }).sendTemplate(input)

        expect(result).toEqual({ ok: false, reason: "REJECTED" })
        expect(JSON.parse(String(logger.log.mock.calls[0]?.[0]))).toEqual({ event: "gateway_template_send_failed", status })
    })

    it("devolve UNREACHABLE quando a chamada lança", async () => {
        const fetchFn = vi.fn<GatewayFetchFn>().mockRejectedValue(new Error("ECONNREFUSED"))
        const logger = { log: vi.fn() }

        const result = await createGatewayClient({ fetchFn, env, logger }).sendTemplate(input)

        expect(result).toEqual({ ok: false, reason: "UNREACHABLE" })
        expect(JSON.parse(String(logger.log.mock.calls[0]?.[0]))).toEqual({ event: "gateway_template_send_failed" })
    })

    it("devolve UNREACHABLE quando o gateway não responde no tempo limite", async () => {
        vi.spyOn(AbortSignal, "timeout").mockImplementation(() => AbortSignal.abort(new DOMException("timeout", "TimeoutError")))
        const fetchFn = vi.fn<GatewayFetchFn>(
            (_url, init) =>
                new Promise((_resolve, reject) => {
                    if (init.signal?.aborted) {
                        reject(init.signal.reason)
                    }
                }),
        )

        const result = await createGatewayClient({ fetchFn, env, logger: { log: vi.fn() } }).sendTemplate(input)

        expect(result).toEqual({ ok: false, reason: "UNREACHABLE" })
    })

    it("não registra o telefone do destinatário no log de falha", async () => {
        const fetchFn = vi.fn<GatewayFetchFn>().mockRejectedValue(new Error(`falhou para ${input.to}`))
        const logger = { log: vi.fn() }

        await createGatewayClient({ fetchFn, env, logger }).sendTemplate(input)

        expect(logger.log).toHaveBeenCalledTimes(1)
        expect(logged(logger)).not.toContain(input.to)
    })
})
