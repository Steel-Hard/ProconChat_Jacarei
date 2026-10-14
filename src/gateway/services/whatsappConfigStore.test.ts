import { describe, expect, test, vi } from "vitest"
import { createWhatsAppConfigStore } from "./whatsappConfigStore"
import ServiceUnavailableError from "../errors/ServiceUnavailableError"
import { WhatsAppConfig } from "../utils/whatsappConfig"

const config: WhatsAppConfig = {
    phoneNumberId: "100000000000001",
    accessToken: "EAAG-token-ficticio",
    appSecret: "segredo-ficticio-do-app",
    verifyToken: "verify-token-ficticio",
    graphApiVersion: "v26.0",
}

function setup() {
    let time = 1_000
    const getWhatsappConfig = vi.fn<() => Promise<WhatsAppConfig>>()
    const logger = { log: vi.fn() }
    const store = createWhatsAppConfigStore({
        backend: { getWhatsappConfig },
        ttlMs: 60_000,
        now: () => time,
        logger,
    })
    return {
        store,
        getWhatsappConfig,
        logger,
        advance: (ms: number) => {
            time += ms
        },
    }
}

describe("whatsappConfigStore", () => {
    test("busca a configuracao no backend na primeira carga", async () => {
        const { store, getWhatsappConfig } = setup()
        getWhatsappConfig.mockResolvedValue(config)

        const loaded = await store.load()

        expect(loaded).toEqual(config)
        expect(store.current()).toEqual(config)
        expect(getWhatsappConfig).toHaveBeenCalledTimes(1)
    })

    test("nao busca de novo dentro do TTL", async () => {
        const { store, getWhatsappConfig, advance } = setup()
        getWhatsappConfig.mockResolvedValue(config)
        await store.load()
        advance(59_999)

        await store.load()

        expect(getWhatsappConfig).toHaveBeenCalledTimes(1)
    })

    test("busca de novo depois do TTL", async () => {
        const { store, getWhatsappConfig, advance } = setup()
        getWhatsappConfig.mockResolvedValueOnce(config).mockResolvedValueOnce({ ...config, accessToken: "token-novo" })
        await store.load()
        advance(60_000)

        const loaded = await store.load()

        expect(getWhatsappConfig).toHaveBeenCalledTimes(2)
        expect(loaded.accessToken).toBe("token-novo")
    })

    test("invalidate faz a proxima carga buscar de novo", async () => {
        const { store, getWhatsappConfig } = setup()
        getWhatsappConfig.mockResolvedValueOnce(config).mockResolvedValueOnce({ ...config, phoneNumberId: "100000000000009" })
        await store.load()

        store.invalidate()
        const loaded = await store.load()

        expect(getWhatsappConfig).toHaveBeenCalledTimes(2)
        expect(loaded.phoneNumberId).toBe("100000000000009")
    })

    test("duas cargas simultaneas fazem uma busca so", async () => {
        const { store, getWhatsappConfig } = setup()
        getWhatsappConfig.mockResolvedValue(config)

        const [first, second] = await Promise.all([store.load(), store.load()])

        expect(first).toEqual(config)
        expect(second).toEqual(config)
        expect(getWhatsappConfig).toHaveBeenCalledTimes(1)
    })

    test("continua com a ultima configuracao boa quando a busca falha e loga sem valores", async () => {
        const { store, getWhatsappConfig, logger } = setup()
        getWhatsappConfig.mockResolvedValueOnce(config).mockRejectedValueOnce(new Error(`falhou ${config.accessToken}`))
        await store.load()
        store.invalidate()

        const loaded = await store.load()

        expect(loaded).toEqual(config)
        expect(logger.log).toHaveBeenCalledWith(JSON.stringify({ event: "whatsapp_config_refresh_failed" }))
        const output = logger.log.mock.calls.map((call) => call.map(String).join(" ")).join("\n")
        expect(output).not.toContain(config.accessToken)
        expect(output).not.toContain(config.appSecret)
    })

    test("lanca ServiceUnavailableError quando a busca falha e nao ha cache", async () => {
        const { store, getWhatsappConfig } = setup()
        getWhatsappConfig.mockRejectedValue(new Error("backend fora"))

        await expect(store.load()).rejects.toBeInstanceOf(ServiceUnavailableError)
        await expect(store.load()).rejects.toMatchObject({ statusCode: 503, code: "SERVICE_UNAVAILABLE" })
        expect(getWhatsappConfig).toHaveBeenCalledTimes(2)
    })

    test("current lanca antes da primeira carga", () => {
        const { store } = setup()

        expect(() => store.current()).toThrow(ServiceUnavailableError)
    })

    test("o aviso de recarga durante uma busca em andamento faz a proxima carga buscar de novo", async () => {
        const { store, getWhatsappConfig } = setup()
        let resolveFirst!: (value: WhatsAppConfig) => void
        getWhatsappConfig
            .mockImplementationOnce(() => new Promise((resolve) => {
                resolveFirst = resolve
            }))
            .mockResolvedValueOnce({ ...config, accessToken: "token-salvo-depois" })

        const first = store.load()
        store.invalidate()
        resolveFirst(config)
        await first
        const loaded = await store.load()

        expect(getWhatsappConfig).toHaveBeenCalledTimes(2)
        expect(loaded.accessToken).toBe("token-salvo-depois")
    })
})
