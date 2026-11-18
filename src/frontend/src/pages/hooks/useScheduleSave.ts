import { useRef, useState } from "react"
import scheduleApi from "@/store/api/schedule.api"
import type ScheduleConflict from "@/types/schedule/ScheduleConflict.types"
import type ScheduleConflictResolution from "@/types/schedule/ScheduleConflictResolution.types"
import type ScheduleConflictResolutionSummary from "@/types/schedule/ScheduleConflictResolutionSummary.types"
import type ScheduleInputWithOrigins from "@/types/schedule/ScheduleInputWithOrigins.types"
import type ScheduleSaveError from "@/types/schedule/ScheduleSaveError.types"
import scheduleSaveErrorOf from "@/utils/schedule/scheduleSaveErrorOf"

type SaveOutcome = {
    revision: number
    error: ScheduleSaveError
    origins: Pick<ScheduleInputWithOrigins, "rangeOrigins" | "blockOrigins">
}

type SaveRequest = {
    built: ScheduleInputWithOrigins
    revision: number
    effectiveFrom?: string
    conflictResolution?: ScheduleConflictResolution
    onSaved: (resolution?: ScheduleConflictResolutionSummary) => void
    onConflicts: (conflicts: ScheduleConflict[]) => void
    onError?: (error: ScheduleSaveError) => void
}

function useScheduleSave(currentRevision: number) {
    const [saveSchedule] = scheduleApi.useSaveScheduleMutation()
    const [saving, setSaving] = useState(false)
    const [outcome, setOutcome] = useState<SaveOutcome | null>(null)
    const inFlight = useRef(false)

    async function save({
        built,
        revision,
        effectiveFrom,
        conflictResolution,
        onSaved,
        onConflicts,
        onError
    }: SaveRequest) {
        if (inFlight.current) {
            return
        }

        inFlight.current = true
        setSaving(true)
        setOutcome(null)

        try {
            const saved = await saveSchedule({
                config: built.input,
                effectiveFrom,
                conflictResolution
            }).unwrap()
            onSaved(saved.resolution)
        } catch (caught) {
            const error = scheduleSaveErrorOf(caught)

            if (error !== null) {
                setOutcome({
                    revision,
                    error,
                    origins: { rangeOrigins: built.rangeOrigins, blockOrigins: built.blockOrigins }
                })
                if (error.kind === "conflicts") {
                    onConflicts(error.conflicts)
                } else {
                    onError?.(error)
                }
            }
        } finally {
            inFlight.current = false
            setSaving(false)
        }
    }

    const active = outcome !== null && outcome.revision === currentRevision ? outcome : null

    return { saving, save, outcome: active }
}

export default useScheduleSave
