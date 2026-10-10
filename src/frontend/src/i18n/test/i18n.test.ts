import { afterEach, describe, expect, it, vi } from "vitest"
import LANGUAGE_STORAGE_KEY from "@/i18n/languageStorageKey"
import saveLanguage from "@/i18n/saveLanguage"

interface PageLoad {
    search?: string
    browserLanguages?: string[]
}

async function loadPage({ search = "", browserLanguages = ["en-US"] }: PageLoad = {}) {
    window.history.pushState({}, "", `/${search}`)
    vi.spyOn(navigator, "languages", "get").mockReturnValue(browserLanguages)
    vi.spyOn(navigator, "language", "get").mockReturnValue(browserLanguages[0] ?? "")
    vi.resetModules()

    const { default: i18n } = await import("@/i18n/i18n")

    return i18n
}

afterEach(() => {
    vi.restoreAllMocks()
    window.history.pushState({}, "", "/")
    localStorage.removeItem(LANGUAGE_STORAGE_KEY)
})

describe("i18n", () => {
    it("abre em pt-BR com o navegador em português sem gravar nada", async () => {
        const i18n = await loadPage({ browserLanguages: ["pt-PT"] })

        expect(i18n.resolvedLanguage).toBe("pt-BR")
        expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull()
    })

    it("mantém a escolha feita por setLanguage", async () => {
        await loadPage({ browserLanguages: ["en"] })
        const { default: setLanguage } = await import("@/i18n/setLanguage")
        await setLanguage("pt-BR")

        const i18n = await loadPage({ browserLanguages: ["es"] })

        expect(i18n.resolvedLanguage).toBe("pt-BR")
        expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("pt-BR")
    })

    it("ativa e grava o idioma de um ?lng= válido", async () => {
        const i18n = await loadPage({ search: "?lng=pt-BR", browserLanguages: ["en"] })

        expect(i18n.resolvedLanguage).toBe("pt-BR")
        expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("pt-BR")
    })

    it("ativa e grava pt-BR para ?lng=pt-PT", async () => {
        const i18n = await loadPage({ search: "?lng=pt-PT", browserLanguages: ["en"] })

        expect(i18n.resolvedLanguage).toBe("pt-BR")
        expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("pt-BR")
    })

    it("ignora um ?lng= inválido sem gravar nada", async () => {
        const i18n = await loadPage({ search: "?lng=xx", browserLanguages: ["pt-BR"] })

        expect(i18n.resolvedLanguage).toBe("pt-BR")
        expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull()
    })

    it.each([["en-US"], ["es-MX"], ["fr-FR"]])(
        "abre no fallback pt-BR com o navegador em %s e nada salvo",
        async (browserLanguage) => {
            const i18n = await loadPage({ browserLanguages: [browserLanguage] })

            expect(i18n.resolvedLanguage).toBe("pt-BR")
            expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBeNull()
        }
    )

    it("abre no fallback pt-BR quando o navegador não informa idioma", async () => {
        const i18n = await loadPage({ browserLanguages: [] })

        expect(i18n.resolvedLanguage).toBe("pt-BR")
    })

    it("ignora um valor salvo que não é idioma suportado", async () => {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, "xx")

        const i18n = await loadPage({ browserLanguages: ["en"] })

        expect(i18n.resolvedLanguage).toBe("pt-BR")
    })

    it("respeita uma escolha salva válida", async () => {
        saveLanguage("pt-BR")

        const i18n = await loadPage({ browserLanguages: ["en"] })

        expect(i18n.resolvedLanguage).toBe("pt-BR")
    })

    it("mantém o lang do html igual ao idioma ativo", async () => {
        document.documentElement.lang = "en"

        await loadPage({ browserLanguages: ["en"] })

        expect(document.documentElement.lang).toBe("pt-BR")
    })
})
