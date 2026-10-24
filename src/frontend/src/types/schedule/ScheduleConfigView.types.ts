import type ScheduleConfig from "@/types/schedule/ScheduleConfig.types"

type ScheduleConfigView = ScheduleConfig & {
    updatedBy: { id: number; name: string } | null
    updatedAt: string | null
}

export default ScheduleConfigView
