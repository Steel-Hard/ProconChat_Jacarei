import { describe, expect, it } from "vitest"
import { WEEK_START_DAY, weekRange } from "./week.utils"

describe("week.utils", () => {
    it("o dia inicial padrão da semana é domingo", () => {
        expect(WEEK_START_DAY).toBe(0)
    })

    it("com domingo como início, devolve a semana de domingo a sábado que contém a data", () => {
        expect(weekRange("2026-10-21", 0)).toEqual({
            weekStart: "2026-10-18",
            weekEnd: "2026-10-24",
            dates: ["2026-10-18", "2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24"],
        })
    })

    it("com segunda como início, a semana vai de segunda a domingo", () => {
        const range = weekRange("2026-10-21", 1)

        expect(range.weekStart).toBe("2026-10-19")
        expect(range.weekEnd).toBe("2026-10-25")
    })

    it("com segunda como início, um domingo pertence à semana que começou na segunda anterior", () => {
        expect(weekRange("2026-10-25", 1).weekStart).toBe("2026-10-19")
    })

    it("quando a data já é o dia inicial, a semana começa nela", () => {
        expect(weekRange("2026-10-18", 0).weekStart).toBe("2026-10-18")
    })

    it("quando a data é o último dia, a semana termina nela", () => {
        expect(weekRange("2026-10-24", 0)).toMatchObject({ weekStart: "2026-10-18", weekEnd: "2026-10-24" })
    })

    it("atravessa a virada do mês", () => {
        expect(weekRange("2026-11-02", 0)).toMatchObject({ weekStart: "2026-11-01", weekEnd: "2026-11-07" })
        expect(weekRange("2026-10-31", 0)).toMatchObject({ weekStart: "2026-10-25", weekEnd: "2026-10-31" })
        expect(weekRange("2026-07-01", 0)).toMatchObject({ weekStart: "2026-06-28", weekEnd: "2026-07-04" })
    })

    it("atravessa a virada do ano", () => {
        expect(weekRange("2027-01-01", 0)).toEqual({
            weekStart: "2026-12-27",
            weekEnd: "2027-01-02",
            dates: ["2026-12-27", "2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"],
        })
    })
})
