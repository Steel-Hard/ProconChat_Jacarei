import { describe, expect, it } from "vitest"
import passwordProblem from "@/utils/users/passwordProblem"

describe("passwordProblem", () => {
    it("não aponta problema na senha vazia nem na senha de 8 a 72 bytes", () => {
        expect(passwordProblem("")).toBeNull()
        expect(passwordProblem("12345678")).toBeNull()
        expect(passwordProblem("a".repeat(72))).toBeNull()
    })

    it("aponta a senha com menos de 8 caracteres", () => {
        expect(passwordProblem("1234567")).toBe("tooShort")
    })

    it("aponta a senha com mais de 72 bytes, contando acentos", () => {
        expect(passwordProblem("é".repeat(37))).toBe("tooLong")
    })
})
