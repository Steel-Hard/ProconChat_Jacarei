import { afterEach, describe, expect, it, vi } from "vitest"
import getLanguage from "@/i18n/getLanguage"
import i18n from "@/i18n/i18n"

async function loadGetLanguageWithBrowserLanguages(browserLanguages: string[]) {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(browserLanguages)
    vi.spyOn(navigator, "language", "get").mockReturnValue(browserLanguages[0] ?? "")
    vi.resetModules()

    const { default: freshGetLanguage } = await import("@/i18n/getLanguage")

    return freshGetLanguage
}

afterEach(() => {
    vi.restoreAllMocks()
})

describe("getLanguage", () => {
    it("devolve pt-BR depois da troca de idioma", async () => {
        await i18n.changeLanguage("pt-BR")

        expect(getLanguage()).toBe("pt-BR")
    })

    it("devolve pt-BR quando o idioma do navegador não é suportado", async () => {
        const freshGetLanguage = await loadGetLanguageWithBrowserLanguages(["fr-FR"])

        expect(freshGetLanguage()).toBe("pt-BR")
    })

    it("devolve pt-BR quando não há idioma resolvido", () => {
        i18n.resolvedLanguage = undefined

        expect(getLanguage()).toBe("pt-BR")
    })
})
