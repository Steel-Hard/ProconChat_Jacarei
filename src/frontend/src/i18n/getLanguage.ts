import FALLBACK_LANGUAGE from "@/i18n/fallbackLanguage"
import i18n from "@/i18n/i18n"
import resolveSupportedLanguage from "@/i18n/resolveSupportedLanguage"
import type SupportedLanguage from "@/types/language/SupportedLanguage.types"

function getLanguage(): SupportedLanguage {
    return resolveSupportedLanguage(i18n.resolvedLanguage) ?? FALLBACK_LANGUAGE
}

export default getLanguage
