import { useEffect, useState } from "react"
import { skipToken } from "@reduxjs/toolkit/query/react"
import scheduleApi from "@/store/api/schedule.api"
import type MonthlyPreview from "@/types/schedule/MonthlyPreview.types"
import type ScheduleConfigInput from "@/types/schedule/ScheduleConfigInput.types"
import type SchedulePreviewConflict from "@/types/schedule/SchedulePreviewConflict.types"
import shiftMonth from "@/utils/schedule/shiftMonth"

type PreviewDraft = {
    hasChanges: boolean
    hasErrors: boolean
    input: ScheduleConfigInput | null
    signature: string
}

const DEBOUNCE_MS = 400
const NO_CONFLICTS: SchedulePreviewConflict[] = []

function useSchedulePreview({ hasChanges, hasErrors, input, signature }: PreviewDraft) {
    const [month, setMonth] = useState<string | undefined>(undefined)
    const [selectedDate, setSelectedDate] = useState<string | null>(null)
    const [debounced, setDebounced] = useState<string | null>(null)
    const [lastValid, setLastValid] = useState<MonthlyPreview | null>(null)
    const wantsDraft = hasChanges && !hasErrors && input !== null

    useEffect(() => {
        if (!wantsDraft) {
            return
        }

        const timer = setTimeout(() => setDebounced(signature), DEBOUNCE_MS)

        return () => clearTimeout(timer)
    }, [wantsDraft, signature])

    const draftReady = wantsDraft && debounced === signature
    const savedQuery = scheduleApi.useGetSchedulePreviewQuery(hasChanges ? skipToken : month)
    const draftQuery = scheduleApi.usePreviewScheduleDraftQuery(
        draftReady && input !== null ? { month, config: input } : skipToken
    )
    const current = hasChanges
        ? draftReady
            ? draftQuery.currentData
            : undefined
        : savedQuery.currentData
    const activeQuery = hasChanges ? draftQuery : savedQuery
    const active = hasChanges ? draftReady : true

    if (current && current !== lastValid) {
        setLastValid(current)
    }

    const shown = current ?? lastValid
    const failed = active && activeQuery.isError
    const stale = hasChanges && hasErrors

    function shiftShownMonth(delta: number) {
        const base = shown?.month

        setMonth((requested) => {
            const from = requested ?? base

            return from === undefined ? requested : shiftMonth(from, delta)
        })
    }

    return {
        preview: shown,
        month: month ?? shown?.month ?? null,
        loading: active && activeQuery.isFetching,
        updating: shown !== null && current === undefined && !failed && !stale,
        failed,
        stale,
        draftConflicts:
            draftReady && draftQuery.currentData ? draftQuery.currentData.conflicts : NO_CONFLICTS,
        selectedDate,
        selectDay: setSelectedDate,
        shiftMonth: shiftShownMonth
    }
}

export default useSchedulePreview
