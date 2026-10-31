import type ScheduleConflictRowView from "@/types/schedule/ScheduleConflictRowView.types"
import type ScheduleVersion from "@/types/schedule/ScheduleVersion.types"

type ScheduleVersionsView = {
    effectiveFrom: string
    currentSince: string | null
    date: string
    dateMin: string | undefined
    dateError: string | null
    versions: ScheduleVersion[]
    versionsFailed: boolean
    cancelConflicts: ScheduleConflictRowView[] | null
    cancelTarget: string | null
    cancelling: boolean
    switchPending: boolean
}

export default ScheduleVersionsView
