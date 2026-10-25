import { describe, expect, it } from "vitest"
import bookedDatesOfWeekday from "@/utils/schedule/bookedDatesOfWeekday"
import rangeHasBooking from "@/utils/schedule/rangeHasBooking"

const BOOKED = [
    { date: "2026-11-11", weekday: 3, total: 1, times: [{ time: "13:30", count: 1 }] },
    { date: "2026-11-04", weekday: 3, total: 1, times: [{ time: "09:00", count: 1 }] },
    { date: "2026-11-05", weekday: 4, total: 1, times: [{ time: "11:30", count: 1 }] }
]

describe("bookedDatesOfWeekday", () => {
    it("devolve as datas com agendamento do dia da semana, em ordem", () => {
        expect(bookedDatesOfWeekday(BOOKED, 3).map((day) => day.date)).toEqual([
            "2026-11-04",
            "2026-11-11"
        ])
        expect(bookedDatesOfWeekday(BOOKED, 1)).toEqual([])
    })
})

describe("rangeHasBooking", () => {
    it("conta o horário igual ao início", () => {
        expect(rangeHasBooking({ startTime: "09:00", endTime: "11:30" }, 3, BOOKED)).toBe(true)
    })

    it("não conta o horário igual ao fim", () => {
        expect(rangeHasBooking({ startTime: "08:30", endTime: "11:30" }, 4, BOOKED)).toBe(false)
    })

    it("não conta horário de outro dia da semana", () => {
        expect(rangeHasBooking({ startTime: "08:30", endTime: "11:30" }, 1, BOOKED)).toBe(false)
    })

    it("conta o horário dentro da faixa de outra data do mesmo dia da semana", () => {
        expect(rangeHasBooking({ startTime: "13:30", endTime: "16:30" }, 3, BOOKED)).toBe(true)
    })
})
