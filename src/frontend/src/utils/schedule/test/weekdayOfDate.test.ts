import { describe, expect, it } from "vitest"
import weekdayOfDate from "@/utils/schedule/weekdayOfDate"

describe("weekdayOfDate", () => {
    it.each([
        ["2026-11-04", 3],
        ["2026-11-02", 1],
        ["2026-11-01", 0],
        ["2026-10-31", 6],
        ["2026-12-31", 4],
        ["2027-01-01", 5]
    ])("calcula o dia da semana de %s sem depender do fuso", (date, weekday) => {
        expect(weekdayOfDate(date)).toBe(weekday)
    })
})
