import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import validateEnv from "./validateEnv"

describe("validateEnv", () => {
    let originalBackendInternalUrl: string | undefined
    let originalGatewayInternalToken: string | undefined

    beforeEach(() => {
        originalBackendInternalUrl = process.env.BACKEND_INTERNAL_URL
        originalGatewayInternalToken = process.env.GATEWAY_INTERNAL_TOKEN
        process.env.BACKEND_INTERNAL_URL = "http://backend:3000"
        process.env.GATEWAY_INTERNAL_TOKEN = "test-internal-token"
    })

    afterEach(() => {
        if (originalBackendInternalUrl === undefined) {
            delete process.env.BACKEND_INTERNAL_URL
        } else {
            process.env.BACKEND_INTERNAL_URL = originalBackendInternalUrl
        }
        if (originalGatewayInternalToken === undefined) {
            delete process.env.GATEWAY_INTERNAL_TOKEN
        } else {
            process.env.GATEWAY_INTERNAL_TOKEN = originalGatewayInternalToken
        }
        vi.restoreAllMocks()
    })

    it("does not exit when all required env vars are set", () => {
        const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never)
        vi.spyOn(console, "error").mockImplementation(() => undefined)

        validateEnv()

        expect(exitSpy).not.toHaveBeenCalled()
    })

    it("exits with code 1 when BACKEND_INTERNAL_URL is missing", () => {
        delete process.env.BACKEND_INTERNAL_URL
        const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never)
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)

        validateEnv()

        expect(exitSpy).toHaveBeenCalledWith(1)
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("BACKEND_INTERNAL_URL"))
    })

    it("exits with code 1 when GATEWAY_INTERNAL_TOKEN is missing", () => {
        delete process.env.GATEWAY_INTERNAL_TOKEN
        const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never)
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)

        validateEnv()

        expect(exitSpy).toHaveBeenCalledWith(1)
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("GATEWAY_INTERNAL_TOKEN"))
    })
})

describe("validateEnv com as variaveis da Cloud API", () => {
    const whatsappVars = [
        "WHATSAPP_PHONE_NUMBER_ID",
        "WHATSAPP_ACCESS_TOKEN",
        "WHATSAPP_APP_SECRET",
        "WHATSAPP_VERIFY_TOKEN",
    ]
    let originals: Record<string, string | undefined> = {}

    beforeEach(() => {
        originals = Object.fromEntries(whatsappVars.map((name) => [name, process.env[name]]))
        for (const name of whatsappVars) {
            process.env[name] = `test-${name.toLowerCase()}`
        }
    })

    afterEach(() => {
        for (const name of whatsappVars) {
            const original = originals[name]
            if (original === undefined) {
                delete process.env[name]
            } else {
                process.env[name] = original
            }
        }
        vi.restoreAllMocks()
    })

    it.each(whatsappVars)("encerra com codigo 1 quando falta %s", (name) => {
        delete process.env[name]
        const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never)
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)

        validateEnv()

        expect(exitSpy).toHaveBeenCalledWith(1)
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining(name))
    })

    it("nao exige WHATSAPP_GRAPH_API_VERSION", () => {
        const original = process.env.WHATSAPP_GRAPH_API_VERSION
        delete process.env.WHATSAPP_GRAPH_API_VERSION
        const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never)
        vi.spyOn(console, "error").mockImplementation(() => undefined)

        validateEnv()

        expect(exitSpy).not.toHaveBeenCalled()
        if (original !== undefined) {
            process.env.WHATSAPP_GRAPH_API_VERSION = original
        }
    })
})

describe("validateEnv com o ambiente minimo", () => {
    let originalEnv: NodeJS.ProcessEnv

    beforeEach(() => {
        originalEnv = process.env
        process.env = {
            BACKEND_INTERNAL_URL: "http://backend:3000",
            GATEWAY_INTERNAL_TOKEN: "test-internal-token",
            WHATSAPP_PHONE_NUMBER_ID: "100000000000001",
            WHATSAPP_ACCESS_TOKEN: "test-access-token",
            WHATSAPP_APP_SECRET: "test-app-secret",
            WHATSAPP_VERIFY_TOKEN: "test-verify-token",
        }
    })

    afterEach(() => {
        process.env = originalEnv
        vi.restoreAllMocks()
    })

    it("nao encerra com o ambiente reduzido as seis variaveis obrigatorias", () => {
        const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never)
        vi.spyOn(console, "error").mockImplementation(() => undefined)

        validateEnv()

        expect(exitSpy).not.toHaveBeenCalled()
    })
})
