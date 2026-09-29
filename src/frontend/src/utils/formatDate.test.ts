import { describe, expect, it } from "vitest"
import { formatDate } from "@/utils/formatDate"

describe("formatDate", () => {
    it("formata a data no padrão brasileiro", () => {
        expect(formatDate(new Date(2024, 0, 5))).toBe("05/01/2024")
    })

    it("preenche dia e mês com zero à esquerda", () => {
        expect(formatDate(new Date(2024, 8, 9))).toBe("09/09/2024")
    })

    it("mantém o ano com quatro dígitos", () => {
        expect(formatDate(new Date(1999, 11, 31))).toBe("31/12/1999")
    })
})
