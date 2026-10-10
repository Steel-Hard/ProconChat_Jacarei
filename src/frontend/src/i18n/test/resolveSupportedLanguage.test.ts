import { describe, expect, it } from "vitest"
import resolveSupportedLanguage from "@/i18n/resolveSupportedLanguage"

describe("resolveSupportedLanguage", () => {
    it("devolve o próprio código suportado pt-BR", () => {
        expect(resolveSupportedLanguage("pt-BR")).toBe("pt-BR")
    })

    it.each([
        ["pt-PT", "pt-BR"],
        ["pt", "pt-BR"],
        ["PT-br", "pt-BR"]
    ])("mapeia a variante %s para %s", (code, expected) => {
        expect(resolveSupportedLanguage(code)).toBe(expected)
    })

    it.each(["en", "en-US", "es", "fr-FR", "xx", ""])(
        "devolve undefined para o código não suportado %j",
        (code) => {
            expect(resolveSupportedLanguage(code)).toBeUndefined()
        }
    )

    it("devolve undefined para null e undefined", () => {
        expect(resolveSupportedLanguage(null)).toBeUndefined()
        expect(resolveSupportedLanguage(undefined)).toBeUndefined()
    })
})
