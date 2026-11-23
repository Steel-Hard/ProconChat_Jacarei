import type SchedulePreviewConflict from "@/types/schedule/SchedulePreviewConflict.types"

type ScheduleConflictTarget = {
    blocks: Record<string, SchedulePreviewConflict[]>
    weekdays: Record<number, SchedulePreviewConflict[]>
    slotMinutes: SchedulePreviewConflict[]
    seatsPerSlot: SchedulePreviewConflict[]
}

export default ScheduleConflictTarget
