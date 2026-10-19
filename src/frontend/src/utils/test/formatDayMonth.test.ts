import { describe, expect, it } from "vitest"
import formatDayMonth from "@/utils/formatDayMonth"

describe("formatDayMonth", () => {
    it("formata em dd/mm com zeros à esquerda", () => {
        expect(formatDayMonth("2026-09-05T13:00:00.000Z")).toBe("05/09")
    })

    it("usa o fuso de Brasília e não o UTC", () => {
        expect(formatDayMonth("2026-09-28T02:30:00.000Z")).toBe("27/09")
    })
})
