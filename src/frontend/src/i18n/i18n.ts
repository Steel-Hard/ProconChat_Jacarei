import { createInstance } from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { initReactI18next } from "react-i18next"
import FALLBACK_LANGUAGE from "@/i18n/fallbackLanguage"
import LANGUAGE_STORAGE_KEY from "@/i18n/languageStorageKey"
import resolveSupportedLanguage from "@/i18n/resolveSupportedLanguage"
import resources from "@/i18n/resources"
import saveLanguage from "@/i18n/saveLanguage"
import SUPPORTED_LANGUAGES from "@/i18n/supportedLanguages"

const LANGUAGE_QUERY_PARAMETER = "lng"

const i18n = createInstance().use(LanguageDetector).use(initReactI18next)

i18n.on("languageChanged", (language) => {
    document.documentElement.lang = language
})

void i18n.init({
    resources,
    supportedLngs: SUPPORTED_LANGUAGES,
    fallbackLng: FALLBACK_LANGUAGE,
    defaultNS: "common",
    ns: ["common", "error", "forbidden", "layoutPreview", "notFound", "underConstruction"],
    initAsync: false,
    interpolation: {
        escapeValue: false
    },
    detection: {
        order: ["querystring", "localStorage", "navigator"],
        lookupQuerystring: LANGUAGE_QUERY_PARAMETER,
        lookupLocalStorage: LANGUAGE_STORAGE_KEY,
        caches: [],
        convertDetectedLanguage: (code) => resolveSupportedLanguage(code) ?? code
    }
})

const languageFromQuery = resolveSupportedLanguage(
    new URLSearchParams(window.location.search).get(LANGUAGE_QUERY_PARAMETER)
)

if (languageFromQuery) {
    saveLanguage(languageFromQuery)
}

export default i18n
