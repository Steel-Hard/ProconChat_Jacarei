import { describe, expect, it } from "vitest"
import dayMonthOf from "@/utils/schedule/dayMonthOf"

describe("dayMonthOf", () => {
    it("monta dd/mm a partir do texto da data", () => {
        expect(dayMonthOf("2026-11-04")).toBe("04/11")
        expect(dayMonthOf("2027-01-01")).toBe("01/01")
    })
})
