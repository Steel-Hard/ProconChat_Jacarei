import type ScheduleConfigView from "@/types/schedule/ScheduleConfigView.types"

type ScheduleVersion = {
    effectiveFrom: string
    config: ScheduleConfigView
}

export default ScheduleVersion
