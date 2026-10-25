import type BlockedDate from "@/types/schedule/BlockedDate.types"

type ScheduleBlockedDateView = BlockedDate & {
    index: number
    messages: string[]
}

export default ScheduleBlockedDateView
