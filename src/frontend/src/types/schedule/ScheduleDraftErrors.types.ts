import type ScheduleDraftField from "@/types/schedule/ScheduleDraftField.types"
import type ScheduleProblem from "@/types/schedule/ScheduleProblem.types"

type ScheduleDraftErrors = {
    ranges: Record<string, ScheduleProblem>
    fields: Partial<Record<ScheduleDraftField, ScheduleProblem>>
    count: number
}

export default ScheduleDraftErrors
