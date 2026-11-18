import { describe, expect, it } from "vitest"
import reportPeriodRange from "@/utils/reports/reportPeriodRange"

describe("reportPeriodRange", () => {
    it("mostra o início sem ano quando os anos são iguais", () => {
        expect(reportPeriodRange("2026-10-08", "2026-11-06", "2026-11-07")).toEqual({
            start: "08/10",
            end: "06/11/2026",
            untilNow: false
        })
    })

    it("mostra o ano no início quando os anos diferem", () => {
        expect(reportPeriodRange("2025-12-20", "2026-01-10", "2026-11-07")).toEqual({
            start: "20/12/2025",
            end: "10/01/2026",
            untilNow: false
        })
    })

    it("marca hoje até agora quando o fim é hoje", () => {
        expect(reportPeriodRange("2026-11-01", "2026-11-07", "2026-11-07").untilNow).toBe(true)
    })
})
