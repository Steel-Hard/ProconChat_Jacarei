import { describe, expect, it } from "vitest"
import weekdayOf from "@/utils/weekdayOf"

describe("weekdayOf", () => {
    it("devolve o dia da semana no fuso de Brasília", () => {
        expect(weekdayOf("2026-09-28T13:00:00.000Z")).toBe("monday")
    })

    it("ainda é domingo em Brasília quando já é segunda em UTC", () => {
        expect(weekdayOf("2026-09-28T02:30:00.000Z")).toBe("sunday")
    })

    it("reconhece o sábado", () => {
        expect(weekdayOf("2026-10-03T15:00:00-03:00")).toBe("saturday")
    })
})
