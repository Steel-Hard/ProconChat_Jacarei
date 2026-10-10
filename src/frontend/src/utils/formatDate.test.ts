import { describe, expect, it } from "vitest"
import { formatDate } from "@/utils/formatDate"

describe("formatDate", () => {
    it("formata a data em dd/mm/aaaa com zeros à esquerda", () => {
        expect(formatDate("2026-09-05T12:00:00-03:00")).toBe("05/09/2026")
    })

    it("usa o fuso de Brasília e não o UTC", () => {
        expect(formatDate("2026-09-28T02:30:00Z")).toBe("27/09/2026")
    })

    it("devolve null para um valor que não é data", () => {
        expect(formatDate("não é data")).toBeNull()
    })

    it("formata uma data sem hora sem deslocar o dia", () => {
        expect(formatDate("2026-12-25")).toBe("25/12/2026")
    })
})
