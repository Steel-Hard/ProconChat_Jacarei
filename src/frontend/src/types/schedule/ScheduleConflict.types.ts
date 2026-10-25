import type SchedulePreviewConflict from "@/types/schedule/SchedulePreviewConflict.types"

type ScheduleConflict = SchedulePreviewConflict & {
    name: string
    cpfMasked: string
}

export default ScheduleConflict
