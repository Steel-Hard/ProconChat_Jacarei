import type ScheduleRangeView from "@/types/schedule/ScheduleRangeView.types"

type ScheduleDayView = {
    weekday: number
    enabled: boolean
    ranges: ScheduleRangeView[]
    canAdd: boolean
    messages: string[]
}

export default ScheduleDayView
