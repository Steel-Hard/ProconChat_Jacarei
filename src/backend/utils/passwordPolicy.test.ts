import { describe, expect, it } from "vitest"
import validatePassword from "./passwordPolicy"

describe("validatePassword", () => {
    it("recusa a senha com 7 caracteres", () => {
        expect(validatePassword("a".repeat(7))).toBe("Password must contain at least 8 characters")
    })

    it("aceita a senha com 8 caracteres", () => {
        expect(validatePassword("a".repeat(8))).toBeNull()
    })

    it("aceita a senha com exatamente 72 bytes em UTF-8", () => {
        const password = "é".repeat(36)

        expect(Buffer.byteLength(password, "utf8")).toBe(72)
        expect(validatePassword(password)).toBeNull()
    })

    it("recusa a senha com 73 bytes mesmo com menos de 72 caracteres", () => {
        const password = `${"é".repeat(36)}a`

        expect(password.length).toBe(37)
        expect(validatePassword(password)).toBe("Password must not exceed 72 bytes")
    })
})
