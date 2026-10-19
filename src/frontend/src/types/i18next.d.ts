import type resources from "@/i18n/resources"
import type layoutPreview from "@/locales/pt-BR/layoutPreview.json"

declare module "i18next" {
    interface CustomTypeOptions {
        defaultNS: "common"
        resources: (typeof resources)["pt-BR"] & { layoutPreview: typeof layoutPreview }
    }
}
