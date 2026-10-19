import { describe, expect, it } from "vitest"
import LANGUAGE_STORAGE_KEY from "@/i18n/languageStorageKey"
import saveLanguage from "@/i18n/saveLanguage"

describe("saveLanguage", () => {
    it("grava o idioma na chave LANGUAGE_STORAGE_KEY do localStorage", () => {
        saveLanguage("pt-BR")

        expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("pt-BR")
    })
})
