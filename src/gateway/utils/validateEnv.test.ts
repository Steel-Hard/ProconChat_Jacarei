import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import validateEnv from "./validateEnv"

describe("validateEnv", () => {
    let originalWebhookToken: string | undefined
    let originalBackendInternalUrl: string | undefined
    let originalGatewayInternalToken: string | undefined

    beforeEach(() => {
        originalWebhookToken = process.env.EVOLUTION_WEBHOOK_TOKEN
        originalBackendInternalUrl = process.env.BACKEND_INTERNAL_URL
        originalGatewayInternalToken = process.env.GATEWAY_INTERNAL_TOKEN
        process.env.EVOLUTION_WEBHOOK_TOKEN = "test-webhook-token"
        process.env.BACKEND_INTERNAL_URL = "http://backend:3000"
        process.env.GATEWAY_INTERNAL_TOKEN = "test-internal-token"
    })

    afterEach(() => {
        if (originalWebhookToken === undefined) {
            delete process.env.EVOLUTION_WEBHOOK_TOKEN
        } else {
            process.env.EVOLUTION_WEBHOOK_TOKEN = originalWebhookToken
        }
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

    it("exits with code 1 when EVOLUTION_WEBHOOK_TOKEN is missing", () => {
        delete process.env.EVOLUTION_WEBHOOK_TOKEN
        const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never)
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)

        validateEnv()

        expect(exitSpy).toHaveBeenCalledWith(1)
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("EVOLUTION_WEBHOOK_TOKEN"))
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
