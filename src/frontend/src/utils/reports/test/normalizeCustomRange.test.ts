import { describe, expect, it } from "vitest"
import normalizeCustomRange from "@/utils/reports/normalizeCustomRange"

const TODAY = "2026-11-07"

describe("normalizeCustomRange", () => {
    it("não consulta com data vazia ou inválida", () => {
        expect(normalizeCustomRange("", "2026-11-05", TODAY)).toBeNull()
        expect(normalizeCustomRange("2026-11-01", "", TODAY)).toBeNull()
        expect(normalizeCustomRange("2026-13-45", "2026-11-05", TODAY)).toBeNull()
    })

    it("mantém um intervalo válido", () => {
        expect(normalizeCustomRange("2026-11-01", "2026-11-05", TODAY)).toEqual({
            startDate: "2026-11-01",
            endDate: "2026-11-05"
        })
    })

    it("limita a data final a hoje", () => {
        expect(normalizeCustomRange("2026-11-01", "2026-12-25", TODAY)).toEqual({
            startDate: "2026-11-01",
            endDate: TODAY
        })
    })

    it("troca as datas quando o início vem depois do fim", () => {
        expect(normalizeCustomRange("2026-11-06", "2026-11-02", TODAY)).toEqual({
            startDate: "2026-11-02",
            endDate: "2026-11-06"
        })
    })

    it("aceita início igual ao fim", () => {
        expect(normalizeCustomRange("2026-11-03", "2026-11-03", TODAY)).toEqual({
            startDate: "2026-11-03",
            endDate: "2026-11-03"
        })
    })

    it("limita o fim a hoje antes de trocar, quando o início é futuro", () => {
        expect(normalizeCustomRange("2026-12-01", "2026-12-20", TODAY)).toEqual({
            startDate: TODAY,
            endDate: TODAY
        })
    })
})
