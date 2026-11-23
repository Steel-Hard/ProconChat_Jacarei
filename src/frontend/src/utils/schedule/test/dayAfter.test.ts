import { describe, expect, it } from "vitest"
import dayAfter from "@/utils/schedule/dayAfter"

describe("dayAfter", () => {
    it("devolve o dia seguinte, virando o mês e o ano", () => {
        expect(dayAfter("2026-11-09")).toBe("2026-11-10")
        expect(dayAfter("2026-11-30")).toBe("2026-12-01")
        expect(dayAfter("2026-12-31")).toBe("2027-01-01")
    })
})
