import i18n from "@/i18n/i18n"
import saveLanguage from "@/i18n/saveLanguage"
import type SupportedLanguage from "@/types/language/SupportedLanguage.types"

async function setLanguage(language: SupportedLanguage): Promise<void> {
    await i18n.changeLanguage(language)
    saveLanguage(language)
}

export default setLanguage
