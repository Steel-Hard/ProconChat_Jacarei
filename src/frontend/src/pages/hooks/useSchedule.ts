import { useTranslation } from "react-i18next"
import useToast from "@/hooks/useToast"
import NAV_ITEMS_READY from "@/navigation/navItemsReady"
import canAccess from "@/navigation/canAccess"
import useBookedDays from "@/pages/hooks/useBookedDays"
import useScheduleDraft from "@/pages/hooks/useScheduleDraft"
import useSchedulePreview from "@/pages/hooks/useSchedulePreview"
import useScheduleSave from "@/pages/hooks/useScheduleSave"
import scheduleApi from "@/store/api/schedule.api"
import useAppSelector from "@/store/useAppSelector"
import type LastChange from "@/types/settings/LastChange.types"
import type BlockedDateProblem from "@/types/schedule/BlockedDateProblem.types"
import type ScheduleBlockedDateView from "@/types/schedule/ScheduleBlockedDateView.types"
import type ScheduleConflictRowView from "@/types/schedule/ScheduleConflictRowView.types"
import type ScheduleDayView from "@/types/schedule/ScheduleDayView.types"
import type ScheduleDraftField from "@/types/schedule/ScheduleDraftField.types"
import type ScheduleIssueField from "@/types/schedule/ScheduleIssueField.types"
import type SchedulePreviewConflict from "@/types/schedule/SchedulePreviewConflict.types"
import type ScheduleProblem from "@/types/schedule/ScheduleProblem.types"
import bookedDatesOfWeekday from "@/utils/schedule/bookedDatesOfWeekday"
import conflictTargets from "@/utils/schedule/conflictTargets"
import dayMonthOf from "@/utils/schedule/dayMonthOf"
import fieldOfIssuePath from "@/utils/schedule/fieldOfIssuePath"
import formatDate from "@/utils/formatDate"
import rangeHasBooking from "@/utils/schedule/rangeHasBooking"
import rangeKey from "@/utils/schedule/rangeKey"

type IssueTarget = Extract<ScheduleIssueField, { kind: "field" }>["field"]
type FieldMessages = Partial<Record<IssueTarget, string[]>>

const MAX_LOCK_DATES = 3
const MAX_RANGES = 3
const SHOWN_FIELDS: readonly IssueTarget[] = [
    "slotMinutes",
    "seatsPerSlot",
    "windowDays",
    "waitAlertDays",
    "unitAddress",
    "unitAddressComplement"
]
const dateList = new Intl.ListFormat("pt-BR", { type: "conjunction" })

function useSchedule() {
    const { t } = useTranslation(["schedule", "common"])
    const { showToast } = useToast()
    const account = useAppSelector((state) => state.account.current)
    const query = scheduleApi.useGetScheduleQuery()
    const view = query.data
    const booked = useBookedDays()
    const draft = useScheduleDraft(view, booked.days)
    const errors = draft.errors
    const errorCount = errors?.count ?? 0
    const hasChanges = draft.changes.length > 0
    const preview = useSchedulePreview({
        hasChanges,
        hasErrors: errorCount > 0,
        input: draft.built?.input ?? null,
        signature: draft.signature
    })
    const saver = useScheduleSave(draft.revision)
    const outcome = saver.outcome?.error ?? null
    const saveConflicts = outcome?.kind === "conflicts" ? outcome.conflicts : null
    const targets = conflictTargets(saveConflicts ?? preview.draftConflicts)

    const rangeIssues: Record<string, string> = {}
    const blockIssues: Record<number, string[]> = {}
    const fieldIssues: FieldMessages = {}
    let unknownIssue = false

    if (saver.outcome && outcome?.kind === "issues") {
        for (const issue of outcome.issues) {
            const target = fieldOfIssuePath(issue.path, saver.outcome.origins)

            if (target?.kind === "range") {
                rangeIssues[rangeKey(target.weekday, target.rangeIndex)] = issue.message
            } else if (target?.kind === "block") {
                blockIssues[target.blockIndex] = [
                    ...(blockIssues[target.blockIndex] ?? []),
                    issue.message
                ]
            } else if (target?.kind === "field" && SHOWN_FIELDS.includes(target.field)) {
                fieldIssues[target.field] = [...(fieldIssues[target.field] ?? []), issue.message]
            } else {
                unknownIssue = true
            }
        }
    }

    function problemText(problem: ScheduleProblem): string {
        return problem.code === "rangeTooShort"
            ? t("problems.rangeTooShort", { minutes: problem.minutes })
            : t(`problems.${problem.code}`)
    }

    function blockProblemText(problem: BlockedDateProblem): string {
        return problem.code === "dateHasAppointments"
            ? t("blocked.problems.dateHasAppointments", { count: problem.count })
            : t(`blocked.problems.${problem.code}`)
    }

    function conflictText(conflict: SchedulePreviewConflict): string {
        return t("conflictMessage", {
            protocol: conflict.protocol,
            date: formatDate(conflict.date) ?? conflict.date,
            time: conflict.time,
            reason: conflict.reason
        })
    }

    function fieldMessages(field: ScheduleDraftField | "slotMinutes", extra: string[] = []) {
        const local = field === "slotMinutes" ? undefined : errors?.fields[field]

        return [...(local ? [problemText(local)] : []), ...(fieldIssues[field] ?? []), ...extra]
    }

    function lockReason(weekday: number): string | null {
        const dates = bookedDatesOfWeekday(booked.days, weekday)

        if (dates.length === 0) {
            return null
        }

        const list = dateList.format(
            dates.slice(0, MAX_LOCK_DATES).map((day) => dayMonthOf(day.date))
        )

        return dates.length > MAX_LOCK_DATES
            ? t("grid.dayLockedMore", { dates: list })
            : t("grid.dayLocked", { dates: list })
    }

    const days: ScheduleDayView[] = (draft.current?.days ?? []).map((day) => ({
        weekday: day.weekday,
        enabled: day.enabled,
        lockedReason: day.enabled ? lockReason(day.weekday) : null,
        ranges: day.ranges.map((range, index) => {
            const key = rangeKey(day.weekday, index)
            const problem = errors?.ranges[key]

            return {
                ...range,
                error: problem ? problemText(problem) : (rangeIssues[key] ?? null),
                removeLocked: rangeHasBooking(range, day.weekday, booked.days)
            }
        }),
        canAdd: day.enabled && day.ranges.length < MAX_RANGES,
        messages: (targets.weekdays[day.weekday] ?? []).map(conflictText)
    }))

    const blocks: ScheduleBlockedDateView[] = (draft.current?.blockedDates ?? [])
        .map((block, index) => ({
            ...block,
            index,
            messages: [
                ...(targets.blocks[block.date] ?? []).map(conflictText),
                ...(blockIssues[index] ?? [])
            ]
        }))
        .toSorted(
            (a, b) =>
                a.date.localeCompare(b.date) || (a.startTime ?? "").localeCompare(b.startTime ?? "")
        )

    const conflictRows: ScheduleConflictRowView[] | null =
        saveConflicts ?? (preview.draftConflicts.length > 0 ? preview.draftConflicts : null)
    const blockedBySave = saveConflicts !== null
    const saveDisabled = errorCount > 0 || preview.draftConflicts.length > 0 || blockedBySave
    const saveHint =
        errorCount > 0
            ? t("save.hintErrors", { count: errorCount })
            : saveDisabled
              ? t("save.hintConflicts")
              : undefined
    const actionError =
        outcome?.kind === "invalidOrigin"
            ? t("common:errors.invalidOrigin")
            : outcome?.kind === "failed" || unknownIssue
              ? t("save.failed")
              : null
    const lastChange: LastChange | null =
        view?.updatedBy && view.updatedAt
            ? { changedBy: view.updatedBy.name, changedAt: view.updatedAt }
            : null

    function save() {
        if (!draft.built || !hasChanges || saveDisabled) {
            return
        }

        const sentRevision = draft.revision

        void saver.save({
            built: draft.built,
            revision: sentRevision,
            onSaved: () => {
                draft.resetIfUnchangedSince(sentRevision)
                showToast(t("save.toast"))
            },
            onConflicts: booked.refetch
        })
    }

    return {
        status: view ? "ready" : query.isError ? "error" : "loading",
        draft: draft.current,
        days,
        blocks,
        newBlock: draft.newBlock,
        newBlockError: draft.newBlockProblem ? blockProblemText(draft.newBlockProblem) : null,
        durationMessages: fieldMessages("slotMinutes", targets.slotMinutes.map(conflictText)),
        seatsMessages: fieldMessages("seatsPerSlot", targets.seatsPerSlot.map(conflictText)),
        windowMessages: fieldMessages("windowDays"),
        waitAlertMessages: fieldMessages("waitAlertDays"),
        addressMessages: fieldMessages("unitAddress"),
        complementMessages: fieldMessages("unitAddressComplement"),
        changes: draft.changes.map((key) => t(`changes.${key}`)),
        saving: saver.saving,
        saveDisabled,
        saveHint,
        save,
        discard: draft.discard,
        conflictRows,
        actionError,
        lastChange,
        showContentLink: canAccess(account, "content") && NAV_ITEMS_READY.content,
        bookedDays: booked.days,
        bookedDaysFailed: booked.failed,
        preview,
        actions: {
            toggleDay: draft.toggleDay,
            changeRange: draft.changeRange,
            removeRange: draft.removeRange,
            addRange: draft.addRange,
            setText: draft.setText,
            setSlotMinutes: draft.setSlotMinutes,
            setMinNoticeDays: draft.setMinNoticeDays,
            setReminderHours: draft.setReminderHours,
            toggleReminder: draft.toggleReminder,
            setNewBlockDate: draft.setNewBlockDate,
            setNewBlockDescription: draft.setNewBlockDescription,
            addBlock: draft.addBlock,
            removeBlock: draft.removeBlock
        }
    }
}

export default useSchedule
