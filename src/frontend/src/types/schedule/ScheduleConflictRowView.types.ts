import type SchedulePreviewConflict from "@/types/schedule/SchedulePreviewConflict.types"

type ScheduleConflictRowView = SchedulePreviewConflict & {
    name?: string
    cpfMasked?: string
}

export default ScheduleConflictRowView
