import { describe, expect, it } from "vitest"
import todayInSaoPaulo from "@/utils/schedule/todayInSaoPaulo"

describe("todayInSaoPaulo", () => {
    it("devolve a data de hoje no fuso de São Paulo, mesmo quando em UTC já é o dia seguinte", () => {
        expect(todayInSaoPaulo(new Date("2026-10-24T23:30:00-03:00"))).toBe("2026-10-24")
    })

    it("devolve a data do dia seguinte logo depois da meia-noite em São Paulo", () => {
        expect(todayInSaoPaulo(new Date("2026-10-25T00:10:00-03:00"))).toBe("2026-10-25")
    })
})
