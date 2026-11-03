import { describe, expect, it } from "vitest"
import type BookedDay from "@/types/schedule/BookedDay.types"
import bookedDaysInVigency from "@/utils/schedule/bookedDaysInVigency"

function day(date: string): BookedDay {
    return { date, weekday: 1, total: 1, times: [{ time: "09:00", count: 1 }] }
}

const DAYS = [day("2026-11-09"), day("2026-11-16"), day("2026-11-23")]

function datesOf(days: BookedDay[]): string[] {
    return days.map((item) => item.date)
}

describe("bookedDaysInVigency", () => {
    it("inclui o dia em que a vigência começa", () => {
        expect(datesOf(bookedDaysInVigency(DAYS, "2026-11-16", null))).toEqual([
            "2026-11-16",
            "2026-11-23"
        ])
    })

    it("deixa de fora o dia em que a próxima mudança começa", () => {
        expect(datesOf(bookedDaysInVigency(DAYS, "2026-11-09", "2026-11-23"))).toEqual([
            "2026-11-09",
            "2026-11-16"
        ])
    })

    it("vai até o fim sem próxima mudança e desde o começo sem data de início", () => {
        expect(datesOf(bookedDaysInVigency(DAYS, "", null))).toEqual(datesOf(DAYS))
    })

    it("devolve a lista vazia quando não há dias com agendamento", () => {
        expect(bookedDaysInVigency([], "2026-11-09", "2026-11-23")).toEqual([])
    })
})
