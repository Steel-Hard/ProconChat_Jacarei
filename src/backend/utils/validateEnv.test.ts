import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import validateEnv from "./validateEnv"

describe("validateEnv", () => {
    let originalDbUrl: string | undefined
    let originalPhoneHashSecret: string | undefined
    let originalGatewayInternalToken: string | undefined
    let originalAuthTokenSecret: string | undefined

    beforeEach(() => {
        originalDbUrl = process.env.DB_URL
        originalPhoneHashSecret = process.env.PHONE_HASH_SECRET
        originalGatewayInternalToken = process.env.GATEWAY_INTERNAL_TOKEN
        originalAuthTokenSecret = process.env.AUTH_TOKEN_SECRET
        process.env.PHONE_HASH_SECRET = "test-secret"
        process.env.GATEWAY_INTERNAL_TOKEN = "test-internal-token"
        process.env.AUTH_TOKEN_SECRET = "test-only-auth-token-secret-with-32-chars"
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
        if (originalGatewayInternalToken === undefined) {
            delete process.env.GATEWAY_INTERNAL_TOKEN
        } else {
            process.env.GATEWAY_INTERNAL_TOKEN = originalGatewayInternalToken
        }
        if (originalAuthTokenSecret === undefined) {
            delete process.env.AUTH_TOKEN_SECRET
        } else {
            process.env.AUTH_TOKEN_SECRET = originalAuthTokenSecret
        }
        vi.restoreAllMocks()
        vi.unstubAllEnvs()
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

    it("exits with code 1 when GATEWAY_INTERNAL_TOKEN is missing", () => {
        delete process.env.GATEWAY_INTERNAL_TOKEN
        const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never)
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)

        validateEnv()

        expect(exitSpy).toHaveBeenCalledWith(1)
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("GATEWAY_INTERNAL_TOKEN"))
    })

    it("encerra com codigo 1 quando falta AUTH_TOKEN_SECRET", () => {
        process.env.DB_URL = "postgres://localhost:5432/test"
        delete process.env.AUTH_TOKEN_SECRET
        const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never)
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)

        validateEnv()

        expect(exitSpy).toHaveBeenCalledWith(1)
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("AUTH_TOKEN_SECRET"))
    })

    it("encerra com codigo 1 quando AUTH_TOKEN_SECRET tem menos de 32 caracteres", () => {
        process.env.DB_URL = "postgres://localhost:5432/test"
        process.env.AUTH_TOKEN_SECRET = "a".repeat(31)
        const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never)
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)

        validateEnv()

        expect(exitSpy).toHaveBeenCalledWith(1)
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("AUTH_TOKEN_SECRET"))
    })

    it.each(["localhost:5173", "nao-e-uma-url", "ftp://painel.exemplo.test"])(
        "encerra com codigo 1 quando FRONTEND_ORIGIN e %s",
        (value) => {
            process.env.DB_URL = "postgres://localhost:5432/test"
            vi.stubEnv("FRONTEND_ORIGIN", value)
            const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never)
            const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)

            validateEnv()

            expect(exitSpy).toHaveBeenCalledWith(1)
            expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("FRONTEND_ORIGIN"))
        },
    )

    it("encerra com codigo 1 quando falta ENCRYPTION_KEY", () => {
        process.env.DB_URL = "postgres://localhost:5432/test"
        vi.stubEnv("ENCRYPTION_KEY", undefined)
        const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never)
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)

        validateEnv()

        expect(exitSpy).toHaveBeenCalledWith(1)
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("ENCRYPTION_KEY"))
    })

    it.each(["a".repeat(63), "g".repeat(64), "a".repeat(65)])("encerra com codigo 1 quando ENCRYPTION_KEY e %s", (value) => {
        process.env.DB_URL = "postgres://localhost:5432/test"
        vi.stubEnv("ENCRYPTION_KEY", value)
        const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never)
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined)

        validateEnv()

        expect(exitSpy).toHaveBeenCalledWith(1)
        expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("ENCRYPTION_KEY"))
    })

    it("aceita ENCRYPTION_KEY com 64 caracteres hexadecimais", () => {
        process.env.DB_URL = "postgres://localhost:5432/test"
        vi.stubEnv("ENCRYPTION_KEY", "0123456789ABCDEF".repeat(4))
        const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never)
        vi.spyOn(console, "error").mockImplementation(() => undefined)

        validateEnv()

        expect(exitSpy).not.toHaveBeenCalled()
    })

    it.each(["https://Painel.Exemplo.test/", "HTTP://LOCALHOST:5173"])("aceita FRONTEND_ORIGIN %s", (value) => {
        process.env.DB_URL = "postgres://localhost:5432/test"
        vi.stubEnv("FRONTEND_ORIGIN", value)
        const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never)
        vi.spyOn(console, "error").mockImplementation(() => undefined)

        validateEnv()

        expect(exitSpy).not.toHaveBeenCalled()
    })
})
