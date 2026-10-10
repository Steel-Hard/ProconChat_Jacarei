import { describe, expect, it } from "vitest"
import i18n from "@/i18n/i18n"
import LANGUAGE_STORAGE_KEY from "@/i18n/languageStorageKey"
import setLanguage from "@/i18n/setLanguage"

describe("setLanguage", () => {
    it("ativa o idioma escolhido no t()", async () => {
        await setLanguage("pt-BR")

        expect(i18n.t("loading")).toBe("Carregando...")
    })

    it("grava o idioma escolhido em LANGUAGE_STORAGE_KEY", async () => {
        await setLanguage("pt-BR")

        expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("pt-BR")
    })

    it("atualiza o lang do html", async () => {
        document.documentElement.lang = "en"

        await setLanguage("pt-BR")

        expect(document.documentElement.lang).toBe("pt-BR")
    })
})
