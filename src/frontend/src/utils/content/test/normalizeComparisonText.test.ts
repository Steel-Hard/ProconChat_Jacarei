import { describe, expect, it } from "vitest"
import normalizeComparisonText from "@/utils/content/normalizeComparisonText"

describe("normalizeComparisonText", () => {
    it("ignora espaços nas pontas, acentos e maiúsculas", () => {
        expect(normalizeComparisonText(" Contrátos ")).toBe(normalizeComparisonText("contratos"))
    })

    it("mantém o que não é acento", () => {
        expect(normalizeComparisonText("Nota Fiscal 2")).toBe("nota fiscal 2")
    })

    it("trata ç como c", () => {
        expect(normalizeComparisonText("Devolução")).toBe("devolucao")
    })
})
