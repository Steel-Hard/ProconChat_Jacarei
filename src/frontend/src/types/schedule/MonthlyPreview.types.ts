import type DayPreview from "@/types/schedule/DayPreview.types"
import type SchedulePreviewConflict from "@/types/schedule/SchedulePreviewConflict.types"
import type WeekdayPreview from "@/types/schedule/WeekdayPreview.types"

type MonthlyPreview = {
    month: string
    today: string
    windowStart: string
    windowEnd: string
    totalWindowSlots: number
    totalWindowSeats: number
    usedWindowSeats: number
    freeWindowSeats: number
    weekdays: WeekdayPreview[]
    days: DayPreview[]
    conflicts: SchedulePreviewConflict[]
}

export default MonthlyPreview
