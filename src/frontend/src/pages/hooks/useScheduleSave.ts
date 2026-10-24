import { useRef, useState } from "react"
import scheduleApi from "@/store/api/schedule.api"
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
    onSaved: () => void
    onConflicts: () => void
}

function useScheduleSave(currentRevision: number) {
    const [saveSchedule] = scheduleApi.useSaveScheduleMutation()
    const [saving, setSaving] = useState(false)
    const [outcome, setOutcome] = useState<SaveOutcome | null>(null)
    const inFlight = useRef(false)

    async function save({ built, revision, onSaved, onConflicts }: SaveRequest) {
        if (inFlight.current) {
            return
        }

        inFlight.current = true
        setSaving(true)
        setOutcome(null)

        try {
            await saveSchedule(built.input).unwrap()
            onSaved()
        } catch (caught) {
            const error = scheduleSaveErrorOf(caught)

            if (error !== null) {
                setOutcome({
                    revision,
                    error,
                    origins: { rangeOrigins: built.rangeOrigins, blockOrigins: built.blockOrigins }
                })
            }

            if (error?.kind === "conflicts") {
                onConflicts()
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
