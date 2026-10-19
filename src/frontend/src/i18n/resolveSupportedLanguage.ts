import SUPPORTED_LANGUAGES from "@/i18n/supportedLanguages"
import type SupportedLanguage from "@/types/language/SupportedLanguage.types"

const LANGUAGE_BY_PRIMARY_SUBTAG = new Map<string, SupportedLanguage>([["pt", "pt-BR"]])

function resolveSupportedLanguage(code: string | null | undefined): SupportedLanguage | undefined {
    if (!code) {
        return undefined
    }

    const exactMatch = SUPPORTED_LANGUAGES.find((language) => language === code)

    if (exactMatch) {
        return exactMatch
    }

    const [primarySubtag] = code.toLowerCase().split("-")

    return LANGUAGE_BY_PRIMARY_SUBTAG.get(primarySubtag)
}

export default resolveSupportedLanguage
