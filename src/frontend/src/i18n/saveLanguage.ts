import LANGUAGE_STORAGE_KEY from "@/i18n/languageStorageKey"
import type SupportedLanguage from "@/types/language/SupportedLanguage.types"

function saveLanguage(language: SupportedLanguage): void {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
}

export default saveLanguage
