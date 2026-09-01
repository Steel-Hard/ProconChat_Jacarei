import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import validateEnv from "./validateEnv"

describe("validateEnv", () => {
    let originalDbUrl: string | undefined

    beforeEach(() => {
        originalDbUrl = process.env.DB_URL
    })

    afterEach(() => {
        if (originalDbUrl === undefined) {
            delete process.env.DB_URL
        } else {
            process.env.DB_URL = originalDbUrl
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
})
