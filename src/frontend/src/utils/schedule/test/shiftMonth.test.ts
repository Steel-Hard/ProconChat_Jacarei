import { describe, expect, it } from "vitest"
import shiftMonth from "@/utils/schedule/shiftMonth"

describe("shiftMonth", () => {
    it.each([
        ["2026-11", 1, "2026-12"],
        ["2026-12", 1, "2027-01"],
        ["2027-01", -1, "2026-12"],
        ["2026-11", 3, "2027-02"]
    ])("leva %s %i mês(es) para %s", (month, delta, expected) => {
        expect(shiftMonth(month, delta)).toBe(expected)
    })
})
