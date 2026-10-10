import i18n from "@/i18n/i18n"
import ptBRLayoutPreview from "@/locales/pt-BR/layoutPreview.json"

function registerLayoutPreviewNamespace() {
    if (!i18n.hasResourceBundle("pt-BR", "layoutPreview")) {
        i18n.addResourceBundle("pt-BR", "layoutPreview", ptBRLayoutPreview)
    }
}

export default registerLayoutPreviewNamespace
