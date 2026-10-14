import { describe, expect, it, vi } from "vitest"
import { createGatewayClient, GatewayFetchFn } from "./gateway.client"

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
