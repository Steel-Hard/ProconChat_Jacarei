import type ScheduleConfigInput from "@/types/schedule/ScheduleConfigInput.types"

type ScheduleInputWithOrigins = {
    input: ScheduleConfigInput
    rangeOrigins: { weekday: number; rangeIndex: number }[]
    blockOrigins: number[]
}

export default ScheduleInputWithOrigins
