import type SchedulePreviewConflict from "@/types/schedule/SchedulePreviewConflict.types"

type ScheduleConflict = SchedulePreviewConflict & {
    id: string
    name: string
    cpfMasked: string
}

export default ScheduleConflict
