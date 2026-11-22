import { useState } from "react"
import { skipToken } from "@reduxjs/toolkit/query/react"
import { useTranslation } from "react-i18next"
import useToast from "@/hooks/useToast"
import NAV_ITEMS_READY from "@/navigation/navItemsReady"
import canAccess from "@/navigation/canAccess"
import useBookedDays from "@/pages/hooks/useBookedDays"
import useScheduleDraft from "@/pages/hooks/useScheduleDraft"
import useSchedulePreview from "@/pages/hooks/useSchedulePreview"
import useScheduleSave from "@/pages/hooks/useScheduleSave"
import scheduleApi from "@/store/api/schedule.api"
import useAppDispatch from "@/store/useAppDispatch"
import useAppSelector from "@/store/useAppSelector"
import type LastChange from "@/types/settings/LastChange.types"
import type BlockedDateProblem from "@/types/schedule/BlockedDateProblem.types"
import type ScheduleBlockedDateView from "@/types/schedule/ScheduleBlockedDateView.types"
import type ScheduleConflict from "@/types/schedule/ScheduleConflict.types"
import type ScheduleConflictResolution from "@/types/schedule/ScheduleConflictResolution.types"
import type ScheduleConflictResolutionRequest from "@/types/schedule/ScheduleConflictResolutionRequest.types"
import type ScheduleConflictResolutionSummary from "@/types/schedule/ScheduleConflictResolutionSummary.types"
import type ScheduleConflictModalOrigin from "@/types/schedule/ScheduleConflictModalOrigin.types"
import type ScheduleConflictRowView from "@/types/schedule/ScheduleConflictRowView.types"
import type ScheduleInputWithOrigins from "@/types/schedule/ScheduleInputWithOrigins.types"
import type ScheduleVersionsActions from "@/types/schedule/ScheduleVersionsActions.types"
import type ScheduleVersionsView from "@/types/schedule/ScheduleVersionsView.types"
import type ScheduleDayView from "@/types/schedule/ScheduleDayView.types"
import type ScheduleDraftField from "@/types/schedule/ScheduleDraftField.types"
import type ScheduleIssueField from "@/types/schedule/ScheduleIssueField.types"
import type ScheduleSaveError from "@/types/schedule/ScheduleSaveError.types"
import type SchedulePreviewConflict from "@/types/schedule/SchedulePreviewConflict.types"
import type ScheduleProblem from "@/types/schedule/ScheduleProblem.types"
import conflictTargets from "@/utils/schedule/conflictTargets"
import dayAfter from "@/utils/schedule/dayAfter"
import dayMonthOf from "@/utils/schedule/dayMonthOf"
import fieldOfIssuePath from "@/utils/schedule/fieldOfIssuePath"
import formatDate from "@/utils/formatDate"
import rangeKey from "@/utils/schedule/rangeKey"
import scheduleSaveErrorOf from "@/utils/schedule/scheduleSaveErrorOf"
import todayInSaoPaulo from "@/utils/schedule/todayInSaoPaulo"

type ConflictsError = Extract<ScheduleSaveError, { kind: "conflicts" }>
type IssueTarget = Extract<ScheduleIssueField, { kind: "field" }>["field"]
type FieldMessages = Partial<Record<IssueTarget, string[]>>
type ConflictModalSource =
    | {
          kind: "save"
          built: ScheduleInputWithOrigins
          revision: number
          effectiveFrom?: string
      }
    | {
          kind: "cancelVersion"
          effectiveFrom: string
      }

const RESULT_TEXT_KEYS = {
    save: {
        kept: "conflictModal.keptToast",
        canceledWithFailures: "conflictModal.save.canceledWithFailures",
        canceledOn: "conflictModal.canceledOnToast",
        canceledOff: "conflictModal.canceledOffToast"
    },
    cancelScheduledChange: {
        kept: "conflictModal.cancelScheduledChange.keptToast",
        canceledWithFailures: "conflictModal.cancelScheduledChange.canceledWithFailures",
        canceledOn: "conflictModal.cancelScheduledChange.canceledOnToast",
        canceledOff: "conflictModal.cancelScheduledChange.canceledOffToast"
    }
} as const

const MAX_RANGES = 3
const SHOWN_FIELDS: readonly IssueTarget[] = [
    "slotMinutes",
    "seatsPerSlot",
    "windowDays",
    "waitAlertDays",
    "unitAddress",
    "unitAddressComplement"
]

function isPeriodProblem(problem: BlockedDateProblem | null): boolean {
    return (
        problem?.code === "periodRequired" ||
        problem?.code === "periodInvalid" ||
        problem?.code === "periodOverlap"
    )
}

function useSchedule() {
    const { t } = useTranslation(["schedule", "common"])
    const { showToast } = useToast()
    const dispatch = useAppDispatch()
    const account = useAppSelector((state) => state.account.current)
    const [effectiveFrom, setEffectiveFrom] = useState("")
    const [dateInput, setDateInput] = useState("")
    const [dateInvalid, setDateInvalid] = useState(false)
    const [pendingVersion, setPendingVersion] = useState<string | null>(null)
    const [cancelTarget, setCancelTarget] = useState<string | null>(null)
    const [modalConflicts, setModalConflicts] = useState<ScheduleConflict[] | null>(null)
    const [modalSource, setModalSource] = useState<ConflictModalSource | null>(null)
    const [modalError, setModalError] = useState<string | null>(null)
    const [modalChanged, setModalChanged] = useState(false)
    const [resolving, setResolving] = useState(false)
    const canManageAppointments =
        account !== null && (account.isAdmin || account.permissions.includes("appointments.manage"))
    const currentQuery = scheduleApi.useGetScheduleQuery()
    const effectiveQuery = scheduleApi.useGetScheduleEffectiveQuery(effectiveFrom || skipToken)
    const versionsQuery = scheduleApi.useGetScheduleVersionsQuery()
    const noticeQuery = scheduleApi.useGetScheduleCancellationNoticeQuery(undefined, {
        skip: modalConflicts === null || !canManageAppointments
    })
    const view = effectiveFrom ? effectiveQuery.currentData : currentQuery.currentData
    const queryFailed = effectiveFrom ? effectiveQuery.isError : currentQuery.isError
    const [deleteVersion, { isLoading: cancelling }] =
        scheduleApi.useDeleteScheduleVersionMutation()
    const [versionActionError, setVersionActionError] = useState<string | null>(null)
    const booked = useBookedDays()
    const versions = versionsQuery.currentData ?? []
    const draft = useScheduleDraft(view)
    const errors = draft.errors
    const errorCount = errors?.count ?? 0
    const hasChanges = draft.changes.length > 0
    const preview = useSchedulePreview({
        hasChanges,
        hasErrors: errorCount > 0,
        input: draft.built?.input ?? null,
        signature: draft.signature,
        effectiveFrom: effectiveFrom || undefined
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
        return t(`blocked.problems.${problem.code}`)
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

    const days: ScheduleDayView[] = (draft.current?.days ?? []).map((day) => ({
        weekday: day.weekday,
        enabled: day.enabled,
        ranges: day.ranges.map((range, index) => {
            const key = rangeKey(day.weekday, index)
            const problem = errors?.ranges[key]

            return {
                ...range,
                error: problem ? problemText(problem) : (rangeIssues[key] ?? null)
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
    const saveDisabled = errorCount > 0 || dateInvalid
    const saveHint = errorCount > 0 ? t("save.hintErrors", { count: errorCount }) : undefined
    const actionError =
        versionActionError ??
        (outcome?.kind === "invalidOrigin"
            ? t("common:errors.invalidOrigin")
            : outcome?.kind === "failed" || unknownIssue
              ? t("save.failed")
              : null)
    const lastChange: LastChange | null =
        view?.updatedBy && view.updatedAt
            ? { changedBy: view.updatedBy.name, changedAt: view.updatedAt }
            : null

    function resolutionToast(
        summary: ScheduleConflictResolutionSummary,
        origin: ScheduleConflictModalOrigin,
        plainMessage: string
    ): string {
        if (summary.affectedCount === 0) {
            return plainMessage
        }

        const keys = RESULT_TEXT_KEYS[origin]
        const count = summary.affectedCount

        if (summary.action === "KEEP") {
            return t(keys.kept, { count })
        }

        if (summary.failedCount > 0) {
            return t(keys.canceledWithFailures, { count, failedCount: summary.failedCount })
        }

        return t(summary.noticeDisabled ? keys.canceledOff : keys.canceledOn, { count })
    }

    function closeConflictModal() {
        if (resolving || saver.saving) {
            return
        }

        setModalConflicts(null)
        setModalSource(null)
        setModalError(null)
        setModalChanged(false)
    }

    function refreshConflictModal(error: ConflictsError) {
        setModalConflicts(error.conflicts)
        setModalChanged(error.changed)

        if (error.changed && error.notice !== null && canManageAppointments) {
            dispatch(
                scheduleApi.util.upsertQueryEntries([
                    {
                        endpointName: "getScheduleCancellationNotice",
                        arg: undefined,
                        value: error.notice
                    }
                ])
            )
        }
    }

    function seenOf(action: ScheduleConflictResolution): ScheduleConflictResolutionRequest {
        return {
            conflictResolution: action,
            seenConflictIds: (modalConflicts ?? []).map((conflict) => conflict.id),
            ...(action === "CANCEL" ? { seenNoticeEnabled: noticeQuery.currentData?.enabled } : {})
        }
    }

    function save() {
        if (!draft.built || !hasChanges || saveDisabled) {
            return
        }

        const built = draft.built
        const sentRevision = draft.revision
        const targetEffectiveFrom = effectiveFrom || undefined

        void saver.save({
            built,
            revision: sentRevision,
            effectiveFrom: targetEffectiveFrom,
            onSaved: () => {
                draft.resetIfUnchangedSince(sentRevision)
                showToast(t(targetEffectiveFrom ? "save.scheduledToast" : "save.toast"))
            },
            onConflicts: (error) => {
                booked.refetch()
                setModalError(null)
                setModalSource({
                    kind: "save",
                    built,
                    revision: sentRevision,
                    effectiveFrom: targetEffectiveFrom
                })
                refreshConflictModal(error)
            }
        })
    }

    async function resolveConflicts(action: ScheduleConflictResolution) {
        if (!modalSource || resolving) {
            return
        }

        setModalError(null)
        setModalChanged(false)
        const seen = seenOf(action)

        if (modalSource.kind === "save") {
            setResolving(true)
            await saver.save({
                built: modalSource.built,
                revision: modalSource.revision,
                effectiveFrom: modalSource.effectiveFrom,
                ...seen,
                onSaved: (resolution) => {
                    draft.resetIfUnchangedSince(modalSource.revision)
                    setModalConflicts(null)
                    setModalSource(null)
                    setModalChanged(false)
                    booked.refetch()
                    const plainMessage = t(
                        modalSource.effectiveFrom ? "save.scheduledToast" : "save.toast"
                    )
                    showToast(
                        resolution
                            ? resolutionToast(resolution, "save", plainMessage)
                            : plainMessage
                    )
                },
                onConflicts: (error) => {
                    booked.refetch()
                    refreshConflictModal(error)
                },
                onError: () => {
                    setModalError(t("conflictModal.resolveFailed"))
                }
            })
            setResolving(false)
            return
        }

        setResolving(true)
        try {
            const result = await deleteVersion({
                effectiveFrom: modalSource.effectiveFrom,
                ...seen
            }).unwrap()
            setModalConflicts(null)
            setModalSource(null)
            setModalChanged(false)
            booked.refetch()

            if (effectiveFrom === modalSource.effectiveFrom) {
                applyVersion("")
            }

            const plainMessage = t("versions.cancelled")
            showToast(
                result?.resolution
                    ? resolutionToast(result.resolution, "cancelScheduledChange", plainMessage)
                    : plainMessage
            )
        } catch (caught) {
            const error = scheduleSaveErrorOf(caught)
            if (error?.kind === "conflicts") {
                refreshConflictModal(error)
            } else {
                setModalError(t("conflictModal.resolveFailed"))
            }
        } finally {
            setResolving(false)
        }
    }

    const today = preview.preview?.today ?? todayInSaoPaulo()

    function applyVersion(date: string) {
        setVersionActionError(null)
        setPendingVersion(null)
        setDateInvalid(false)
        draft.discard()
        setEffectiveFrom(date)
        setDateInput(date)
    }

    function requestVersion(date: string) {
        if (date === effectiveFrom) {
            setDateInput(date)
            setDateInvalid(false)
            return
        }

        if (hasChanges) {
            setPendingVersion(date)
            return
        }

        applyVersion(date)
    }

    function changeDate(value: string) {
        setDateInput(value)

        if (value !== "" && value <= today) {
            setDateInvalid(true)
            return
        }

        setDateInvalid(false)
        requestVersion(value)
    }

    function dismissSwitch() {
        setPendingVersion(null)
        setDateInput(effectiveFrom)
        setDateInvalid(false)
    }

    async function confirmCancel() {
        const date = cancelTarget

        if (date === null) {
            return
        }

        setVersionActionError(null)

        try {
            await deleteVersion(date).unwrap()
            setCancelTarget(null)

            if (effectiveFrom === date) {
                applyVersion("")
            }

            showToast(t("versions.cancelled"))
        } catch (caught) {
            setCancelTarget(null)
            const error = scheduleSaveErrorOf(caught)

            if (error?.kind === "conflicts") {
                setModalError(null)
                setModalSource({ kind: "cancelVersion", effectiveFrom: date })
                refreshConflictModal(error)
            } else if (error !== null) {
                setVersionActionError(t("versions.cancelFailed"))
            }
        }
    }

    const modalOrigin: ScheduleConflictModalOrigin =
        modalSource?.kind === "cancelVersion" ? "cancelScheduledChange" : "save"

    const versionsView: ScheduleVersionsView = {
        effectiveFrom,
        currentSince: effectiveFrom ? null : (currentQuery.currentData?.effectiveFrom ?? null),
        date: dateInput,
        dateMin: dayAfter(today),
        dateError: dateInvalid ? t("versions.dateError") : null,
        versions,
        versionsFailed: versionsQuery.isError,
        cancelTarget,
        cancelling,
        switchPending: pendingVersion !== null
    }

    const versionActions: ScheduleVersionsActions = {
        changeDate,
        returnCurrent: () => requestVersion(""),
        edit: requestVersion,
        askCancel: setCancelTarget,
        confirmCancel: () => void confirmCancel(),
        dismissCancel: () => setCancelTarget(null),
        confirmSwitch: () => {
            if (pendingVersion !== null) {
                applyVersion(pendingVersion)
            }
        },
        dismissSwitch
    }

    return {
        status: view ? "ready" : queryFailed ? "error" : "loading",
        draft: draft.current,
        versionsView,
        versionActions,
        days,
        blocks,
        newBlock: draft.newBlock,
        newBlockError: draft.newBlockProblem ? blockProblemText(draft.newBlockProblem) : null,
        newBlockPeriodInvalid: isPeriodProblem(draft.newBlockProblem),
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
        conflictModal: {
            conflicts: modalConflicts,
            origin: modalOrigin,
            changeDate:
                modalSource?.kind === "cancelVersion"
                    ? dayMonthOf(modalSource.effectiveFrom)
                    : null,
            changedNotice: modalChanged,
            canManageAppointments,
            noticeEnabled: noticeQuery.currentData?.enabled ?? null,
            noticeProblemCode: noticeQuery.currentData?.enabled
                ? (noticeQuery.currentData.problem?.code ?? null)
                : null,
            noticeLoading: noticeQuery.isFetching,
            noticeFailed: noticeQuery.isError,
            busy: resolving || saver.saving,
            error: modalError,
            onRetryNotice: () => void noticeQuery.refetch(),
            onKeep: () => void resolveConflicts("KEEP"),
            onCancelAppointments: () => void resolveConflicts("CANCEL"),
            onClose: closeConflictModal
        },
        actionError,
        lastChange,
        showContentLink: canAccess(account, "content") && NAV_ITEMS_READY.content,
        isAdmin: account?.isAdmin === true,
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
            setNewBlockFullDay: draft.setNewBlockFullDay,
            setNewBlockStartTime: draft.setNewBlockStartTime,
            setNewBlockEndTime: draft.setNewBlockEndTime,
            addBlock: draft.addBlock,
            removeBlock: draft.removeBlock
        }
    }
}

export default useSchedule
