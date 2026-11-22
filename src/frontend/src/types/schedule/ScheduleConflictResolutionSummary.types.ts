import type ScheduleConflictResolution from "@/types/schedule/ScheduleConflictResolution.types"

type ScheduleConflictResolutionSummary = {
    action: ScheduleConflictResolution
    affectedCount: number
    notifiedCount: number
    failedCount: number
    noticeDisabled: boolean
}

export default ScheduleConflictResolutionSummary
