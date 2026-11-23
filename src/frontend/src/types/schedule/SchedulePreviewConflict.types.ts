import type ScheduleConflictCode from "@/types/schedule/ScheduleConflictCode.types"

type SchedulePreviewConflict = {
    protocol: string
    date: string
    time: string
    status: "PENDING" | "CONFIRMED"
    code: ScheduleConflictCode
    reason: string
}

export default SchedulePreviewConflict
