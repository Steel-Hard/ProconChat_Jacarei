import type ScheduleRangeView from "@/types/schedule/ScheduleRangeView.types"

type ScheduleDayView = {
    weekday: number
    enabled: boolean
    lockedReason: string | null
    ranges: ScheduleRangeView[]
    canAdd: boolean
    messages: string[]
}

export default ScheduleDayView
