import { describe, expect, it } from "vitest"
import {
    getThisWeekBounds,
    getTodayBounds,
    isDateOnOrBeforeToday,
    isDatetimePast,
    parseLocalDate,
    toLocalDateString,
} from "./date.utils"

describe("date.utils", () => {
    describe("toLocalDateString", () => {
        it("devolve a data de São Paulo quando em UTC já é o dia seguinte", () => {
            expect(toLocalDateString(new Date("2026-10-21T02:00:00Z"))).toBe("2026-10-20")
        })

        it("devolve a mesma data no meio do dia", () => {
            expect(toLocalDateString(new Date("2026-10-20T15:00:00Z"))).toBe("2026-10-20")
        })
    })

    describe("isDateOnOrBeforeToday", () => {
        it("considera de hoje o atendimento às 23h local mesmo que em UTC seja o dia seguinte", () => {
            const appointment = new Date("2026-10-20T23:00:00-03:00")

            expect(isDateOnOrBeforeToday(appointment, new Date("2026-10-20T10:00:00-03:00"))).toBe(true)
        })

        it("não considera de hoje o dia seguinte local mesmo quando o dia em UTC coincide", () => {
            const appointment = new Date("2026-10-21T08:00:00-03:00")

            expect(isDateOnOrBeforeToday(appointment, new Date("2026-10-20T23:30:00-03:00"))).toBe(false)
        })
    })

    describe("isDatetimePast", () => {
        it("considera passado o mesmo instante e não o instante seguinte", () => {
            const now = new Date("2026-10-20T15:00:00-03:00")

            expect(isDatetimePast(new Date(now.getTime()), now)).toBe(true)
            expect(isDatetimePast(new Date(now.getTime() + 1), now)).toBe(false)
        })
    })

    describe("getTodayBounds", () => {
        it("usa o dia local quando em UTC já é o dia seguinte", () => {
            const bounds = getTodayBounds(new Date("2026-10-21T02:00:00Z"))

            expect(bounds.start.toISOString()).toBe("2026-10-20T03:00:00.000Z")
            expect(bounds.end.toISOString()).toBe("2026-10-21T02:59:59.999Z")
        })

        it("às 00h30 local cobre o dia inteiro que acabou de começar", () => {
            const bounds = getTodayBounds(new Date("2026-10-20T00:30:00-03:00"))

            expect(bounds.start.toISOString()).toBe("2026-10-20T03:00:00.000Z")
            expect(bounds.end.toISOString()).toBe("2026-10-21T02:59:59.999Z")
        })
    })

    describe("getThisWeekBounds", () => {
        it("começa no domingo e termina no sábado quando hoje é domingo", () => {
            const bounds = getThisWeekBounds(new Date("2026-10-18T10:00:00-03:00"))

            expect(bounds.start.toISOString()).toBe("2026-10-18T03:00:00.000Z")
            expect(bounds.end.toISOString()).toBe("2026-10-25T02:59:59.999Z")
        })

        it("no sábado às 23h local continua na mesma semana, mesmo já sendo domingo em UTC", () => {
            const bounds = getThisWeekBounds(new Date("2026-10-24T23:00:00-03:00"))

            expect(bounds.start.toISOString()).toBe("2026-10-18T03:00:00.000Z")
            expect(bounds.end.toISOString()).toBe("2026-10-25T02:59:59.999Z")
        })

        it("cobre a semana que cruza a virada do mês", () => {
            const bounds = getThisWeekBounds(new Date("2026-09-30T12:00:00-03:00"))

            expect(bounds.start.toISOString()).toBe("2026-09-27T03:00:00.000Z")
            expect(bounds.end.toISOString()).toBe("2026-10-04T02:59:59.999Z")
        })
    })

    describe("parseLocalDate", () => {
        it("converte 08:00 de São Paulo para 11:00 UTC", () => {
            expect(parseLocalDate("2026-10-20", "08:00").toISOString()).toBe("2026-10-20T11:00:00.000Z")
        })

        it("converte a meia-noite local para 03:00 UTC do mesmo dia", () => {
            expect(parseLocalDate("2026-10-20", "00:00").toISOString()).toBe("2026-10-20T03:00:00.000Z")
        })

        it("converte 23:59 local para 02:59 UTC do dia seguinte", () => {
            expect(parseLocalDate("2026-10-20", "23:59").toISOString()).toBe("2026-10-21T02:59:00.000Z")
        })
    })
})
