import type DayPreview from "@/types/schedule/DayPreview.types"
import type MonthlyPreview from "@/types/schedule/MonthlyPreview.types"

type DayOverrides = Partial<DayPreview> & { date: string }

function weekdayOf(date: string): number {
    const [year, month, day] = date.split("-").map(Number)

    return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay()
}

function monthDays(month: string): string[] {
    const [year, monthNumber] = month.split("-").map(Number)
    const total = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()

    return Array.from(
        { length: total },
        (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`
    )
}

function buildDay(date: string, overrides: Partial<DayPreview> = {}): DayPreview {
    return {
        date,
        weekday: weekdayOf(date),
        status: "OUTSIDE_WINDOW",
        totalSlots: 0,
        capacity: 0,
        usedSeats: 0,
        freeSeats: 0,
        blockDescription: null,
        slots: [],
        ...overrides
    }
}

function buildMonthlyPreview(
    month = "2026-11",
    days: DayOverrides[] = [],
    overrides: Partial<MonthlyPreview> = {}
): MonthlyPreview {
    const byDate = new Map(days.map((day) => [day.date, day]))

    return {
        month,
        today: "2026-10-24",
        windowStart: "2026-10-27",
        windowEnd: "2026-11-23",
        totalWindowSlots: 120,
        totalWindowSeats: 240,
        usedWindowSeats: 4,
        freeWindowSeats: 236,
        weekdays: [1, 2, 3, 4, 5].map((weekday) => ({
            weekday,
            slots: ["08:30", "09:00"],
            totalSlots: 2,
            totalSeats: 4
        })),
        days: monthDays(month).map((date) => buildDay(date, byDate.get(date))),
        conflicts: [],
        ...overrides
    }
}

export default buildMonthlyPreview
