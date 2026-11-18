import { describe, expect, it } from "vitest"
import formatReportAverage from "@/utils/reports/formatReportAverage"
import formatReportCount from "@/utils/reports/formatReportCount"
import formatReportPercent from "@/utils/reports/formatReportPercent"

describe("formatação dos relatórios", () => {
    it("percentual sempre com uma casa e vírgula", () => {
        expect(formatReportPercent(14.3)).toBe("14,3")
        expect(formatReportPercent(25)).toBe("25,0")
        expect(formatReportPercent(0)).toBe("0,0")
        expect(formatReportPercent(28.571)).toBe("28,6")
    })

    it("média com até uma casa, sem forçar zero", () => {
        expect(formatReportAverage(11)).toBe("11")
        expect(formatReportAverage(11.3)).toBe("11,3")
        expect(formatReportAverage(0.04)).toBe("0")
    })

    it("contagem com separador de milhar", () => {
        expect(formatReportCount(1234)).toBe("1.234")
        expect(formatReportCount(7)).toBe("7")
    })
})
