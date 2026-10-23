import { addDaysToDateString } from "./date.utils"

export const WEEK_START_DAY = 0

export interface WeekRange {
    weekStart: string
    weekEnd: string
    dates: string[]
}

function weekdayOf(dateStr: string): number {
    const [y, m, d] = dateStr.split("-").map(Number)
    return new Date(Date.UTC(y!, m! - 1, d!, 12, 0, 0)).getUTCDay()
}

export function weekRange(dateStr: string, weekStartDay: number): WeekRange {
    const offset = (weekdayOf(dateStr) - weekStartDay + 7) % 7
    const weekStart = addDaysToDateString(dateStr, -offset)
    const dates = [0, 1, 2, 3, 4, 5, 6].map((day) => addDaysToDateString(weekStart, day))
    return { weekStart, weekEnd: dates[6]!, dates }
}
