import type ScheduleConfig from "@/types/schedule/ScheduleConfig.types"

type ScheduleConfigView = ScheduleConfig & {
    effectiveFrom?: string | null
    updatedBy: { id: number; name: string } | null
    updatedAt: string | null
}

export default ScheduleConfigView
