import type ScheduleConflictResolution from "@/types/schedule/ScheduleConflictResolution.types"

type ScheduleConflictResolutionRequest = {
    conflictResolution?: ScheduleConflictResolution
    seenConflictIds?: string[]
    seenNoticeEnabled?: boolean
}

export default ScheduleConflictResolutionRequest
