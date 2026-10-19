import { describe, expect, it } from "vitest"
import i18n from "@/i18n/i18n"
import registerLayoutPreviewNamespace from "@/i18n/registerLayoutPreviewNamespace"
import resources from "@/i18n/resources"

describe("registerLayoutPreviewNamespace", () => {
    it("não inclui o namespace da prévia nos recursos carregados na inicialização", () => {
        expect(Object.keys(resources["pt-BR"])).not.toContain("layoutPreview")
    })

    it("registra o namespace da prévia em pt-BR uma única vez", () => {
        registerLayoutPreviewNamespace()
        registerLayoutPreviewNamespace()

        expect(i18n.hasResourceBundle("pt-BR", "layoutPreview")).toBe(true)
        expect(i18n.t("heading", { ns: "layoutPreview" })).toBe("Prévia do layout")
    })
})
