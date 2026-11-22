import { describe, expect, it } from "vitest"
import validateCategoryDraft from "@/utils/content/validateCategoryDraft"

const base = { key: "nova-1", title: "Contratos", shortTitle: "Contratos", description: "" }
const others = [{ key: "1", title: "Contratos" }]

function keysOf(fields: Partial<typeof base>, existing = [] as { key: string; title: string }[]) {
    return validateCategoryDraft({ ...base, ...fields }, existing).errors.map((error) => error.key)
}

describe("validateCategoryDraft", () => {
    it("recusa nome 'contrátos ' repetido de 'Contratos'", () => {
        expect(keysOf({ key: "nova-1", title: "contrátos " }, others)).toEqual([
            "duplicateCategoryName"
        ])
    })

    it("ignora a própria categoria na unicidade", () => {
        expect(keysOf({ key: "1", title: "Contratos" }, others)).toEqual([])
    })

    it("aceita o título curto com 24 caracteres e recusa com 25", () => {
        expect(keysOf({ shortTitle: "a".repeat(24), title: "Outro" })).toEqual([])
        expect(keysOf({ shortTitle: "a".repeat(25), title: "Outro" })).toEqual([
            "errors.shortTitleMax"
        ])
    })

    it("recusa título curto vazio ou só com espaços", () => {
        expect(keysOf({ shortTitle: "   ", title: "Outro" })).toEqual(["errors.shortTitleRequired"])
    })

    it("recusa nome vazio, com mais de 150 e aceita 150", () => {
        expect(keysOf({ title: "" })).toEqual(["errors.titleRequired"])
        expect(keysOf({ title: "a".repeat(151) })).toEqual(["errors.titleMax"])
        expect(keysOf({ title: "a".repeat(150) })).toEqual([])
    })

    it("recusa quebra de linha e tabulação no título curto e no nome", () => {
        expect(keysOf({ shortTitle: "a\nb", title: "Outro" })).toEqual(["errors.noLineBreaks"])
        expect(keysOf({ title: "a\tb" })).toEqual(["errors.noLineBreaks"])
    })

    it("aceita descrição vazia e com 500, recusa com 501", () => {
        expect(keysOf({ description: "" })).toEqual([])
        expect(keysOf({ description: "a".repeat(500) })).toEqual([])
        expect(keysOf({ description: "a".repeat(501) })).toEqual(["errors.descriptionMax"])
    })

    it("devolve valid conforme os erros", () => {
        expect(validateCategoryDraft(base, []).valid).toBe(true)
        expect(validateCategoryDraft({ ...base, shortTitle: "" }, []).valid).toBe(false)
    })
})
