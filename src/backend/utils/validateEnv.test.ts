import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import validateEnv from "./validateEnv"

describe("validateEnv", () => {
    let originalDbUrl: string | undefined
    let originalPhoneHashSecret: string | undefined
    let originalWebhookToken: string | undefined

    beforeEach(() => {
        originalDbUrl = process.env.DB_URL
        originalPhoneHashSecret = process.env.PHONE_HASH_SECRET
        originalWebhookToken = process.env.EVOLUTION_WEBHOOK_TOKEN
        process.env.PHONE_HASH_SECRET = "test-secret"
        process.env.EVOLUTION_WEBHOOK_TOKEN = "test-webhook-token"
    })

    afterEach(() => {
        if (originalDbUrl === undefined) {
            delete process.env.DB_URL
        } else {
            process.env.DB_URL = originalDbUrl
        }
        if (originalPhoneHashSecret === undefined) {
            delete process.env.PHONE_HASH_SECRET
        } else {
            process.env.PHONE_HASH_SECRET = originalPhoneHashSecret
        }
        if (originalWebhookToken === undefined) {
            delete process.env.EVOLUTION_WEBHOOK_TOKEN
        } else {
            process.env.EVOLUTION_WEBHOOK_TOKEN = originalWebhookToken
        }
        vi.restoreAllMocks()
    })

    it("does not exit when DB_URL is set", () => {
        process.env.DB_URL = "postgres://localhost:5432/test"
        const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never)
        vi.spyOn(console, "error").mockImplementation(() => undefined)

        validateEnv()

        expect(exitSpy).not.toHaveBeenCalled()
    })

    it("exits with code 1 and logs an error when DB_URL is missing", () => {
        delete process.env.DB_URL
        const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never)
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)

        validateEnv()

        expect(exitSpy).toHaveBeenCalledWith(1)
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("DB_URL"))
    })

    it("exits with code 1 when PHONE_HASH_SECRET is missing", () => {
        delete process.env.PHONE_HASH_SECRET
        const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never)
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)

        validateEnv()

        expect(exitSpy).toHaveBeenCalledWith(1)
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("PHONE_HASH_SECRET"))
    })

    it("exits with code 1 when EVOLUTION_WEBHOOK_TOKEN is missing", () => {
        delete process.env.EVOLUTION_WEBHOOK_TOKEN
        const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never)
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)

        validateEnv()

        expect(exitSpy).toHaveBeenCalledWith(1)
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("EVOLUTION_WEBHOOK_TOKEN"))
    })
})
