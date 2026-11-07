import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import useToast from "@/hooks/useToast"
import appointmentsApi from "@/store/api/appointments.api"
import useAppDispatch from "@/store/useAppDispatch"
import type AppointmentAction from "@/types/appointments/AppointmentAction.types"
import type AppointmentActionItemView from "@/types/appointments/AppointmentActionItemView.types"
import type AppointmentActionsView from "@/types/appointments/AppointmentActionsView.types"
import type AppointmentDetail from "@/types/appointments/AppointmentDetail.types"
import type AppointmentStatus from "@/types/status/AppointmentStatus.types"
import appointmentActionErrorKey from "@/utils/appointmentActionErrorKey"
import appointmentActionErrorDetails from "@/utils/appointmentActionErrorDetails"

type ConfirmableAction = Extract<
    AppointmentAction,
    "claim" | "attended" | "no_show" | "correct_record"
>
type ActionKey = "claim" | "attended" | "noShow" | "correctRecord"
type ErrorKey = ReturnType<typeof appointmentActionErrorKey>

type Options = {
    detail: AppointmentDetail | undefined
    canManage: boolean
}

const ACTIONS: ConfirmableAction[] = ["claim", "attended", "no_show", "correct_record"]

const ACTION_KEYS: Record<ConfirmableAction, ActionKey> = {
    claim: "claim",
    attended: "attended",
    no_show: "noShow",
    correct_record: "correctRecord"
}

const WAITING_CODES: Partial<Record<AppointmentAction, string>> = {
    attended: "ATTENDANCE_NOT_YET_AVAILABLE",
    no_show: "NO_SHOW_NOT_YET_AVAILABLE"
}

const FINAL_KEYS: Record<
    AppointmentStatus,
    "actions.final.attended" | "actions.final.noShow" | "actions.final.canceled" | null
> = {
    PENDING: null,
    CONFIRMED: null,
    ATTENDED: "actions.final.attended",
    NO_SHOW: "actions.final.noShow",
    CANCELED: "actions.final.canceled"
}

function statusOf(error: unknown): unknown {
    return typeof error === "object" && error !== null && "status" in error ? error.status : null
}

function isConfirmableAction(action: AppointmentAction): action is ConfirmableAction {
    return (
        action === "claim" ||
        action === "attended" ||
        action === "no_show" ||
        action === "correct_record"
    )
}

function useAppointmentActions({ detail, canManage }: Options) {
    const { t } = useTranslation(["appointmentDetail", "common"])
    const { showToast } = useToast()
    const dispatch = useAppDispatch()
    const [updateStatus] = appointmentsApi.useUpdateAppointmentStatusMutation()
    const [addNoteMutation] = appointmentsApi.useAddAppointmentNoteMutation()
    const staffQuery = appointmentsApi.useGetAppointmentStaffQuery(undefined, {
        skip: !canManage || detail?.available_actions.assign.allowed !== true
    })
    const [pending, setPending] = useState<ConfirmableAction | null>(null)
    const [selectedStaffId, setSelectedStaffId] = useState("")
    const [noteText, setNoteText] = useState("")
    const [noteBusy, setNoteBusy] = useState(false)
    const [busy, setBusy] = useState(false)
    const [errorKey, setErrorKey] = useState<ErrorKey | null>(null)
    const inFlight = useRef(false)
    const mounted = useRef(false)

    useEffect(() => {
        mounted.current = true

        return () => {
            mounted.current = false
        }
    }, [])

    const open = useCallback((action: AppointmentAction) => {
        if (isConfirmableAction(action)) {
            setPending(action)
        }
    }, [])

    const cancel = useCallback(() => {
        if (!inFlight.current) {
            setPending(null)
        }
    }, [])

    async function confirm() {
        if (detail === undefined || pending === null || inFlight.current) {
            return
        }

        const action = pending
        inFlight.current = true
        setBusy(true)
        setErrorKey(null)
        const result = await updateStatus({ id: detail.id, action })

        if ("data" in result && result.data !== undefined) {
            const warning = result.data.correction_warning
            if (action === "correct_record" && warning) {
                if (warning.code === "RESPONSIBLE_BUSY" && warning.details.conflictingProtocol) {
                    showToast(
                        t("actions.correctRecord.warning.busy", {
                            protocol: warning.details.conflictingProtocol
                        })
                    )
                } else {
                    if (warning.details.freeStaffCount === 0) {
                        showToast(t("actions.correctRecord.warning.noStaff"))
                    } else {
                        showToast(
                            t("actions.correctRecord.warning.unavailable", {
                                count: warning.details.freeStaffCount
                            })
                        )
                    }
                }
            } else {
                showToast(
                    t(`common:appointmentActions.success.${action}`, { protocol: detail.protocol })
                )
            }
        } else {
            const status = statusOf(result.error)

            if (status !== 403 && status !== 404) {
                await dispatch(
                    appointmentsApi.endpoints.getAppointment.initiate(detail.id, {
                        subscribe: false,
                        forceRefetch: true
                    })
                )
            }

            if (mounted.current) {
                const errorDetails = appointmentActionErrorDetails(result.error)
                setErrorKey(appointmentActionErrorKey(result.error))
                if (errorDetails.code === "ASSIGNEE_BUSY" && errorDetails.conflictingProtocol) {
                    showToast(
                        t("common:appointmentActions.errors.ASSIGNEE_BUSY", {
                            protocol: errorDetails.conflictingProtocol
                        })
                    )
                }
            }
        }

        inFlight.current = false

        if (mounted.current) {
            setBusy(false)
            setPending(null)
        }
    }

    async function assign() {
        if (
            detail === undefined ||
            selectedStaffId === "" ||
            inFlight.current ||
            !detail.available_actions.assign.allowed
        ) {
            return
        }

        inFlight.current = true
        setBusy(true)
        const result = await updateStatus({
            id: detail.id,
            action: "assign",
            assigneeUserId: selectedStaffId
        })

        if ("data" in result && result.data !== undefined) {
            const staff = staffQuery.currentData?.find((person) => person.id === selectedStaffId)
            showToast(
                t("common:appointmentActions.success.assign", {
                    protocol: detail.protocol,
                    name: staff?.name ?? ""
                })
            )
        } else {
            const errorDetails = appointmentActionErrorDetails(result.error)
            showToast(
                t(`common:${appointmentActionErrorKey(result.error)}`, {
                    protocol: errorDetails.conflictingProtocol ?? "",
                    defaultValue: t("common:appointmentActions.errors.failed")
                })
            )
        }

        inFlight.current = false
        if (mounted.current) {
            setBusy(false)
        }
    }

    async function addNote() {
        const text = noteText.trim()
        if (
            detail === undefined ||
            text === "" ||
            noteBusy ||
            !detail.available_actions.add_note.allowed
        ) {
            return
        }

        setNoteBusy(true)
        const result = await addNoteMutation({ id: detail.id, text })
        if ("data" in result && result.data !== undefined) {
            setNoteText("")
            showToast(t("notes.success"))
        } else {
            showToast(t("notes.error"))
        }
        if (mounted.current) {
            setNoteBusy(false)
        }
    }

    let view: AppointmentActionsView | null = null

    if (detail !== undefined) {
        const active = detail.status === "PENDING" || detail.status === "CONFIRMED"
        const items: AppointmentActionItemView[] = canManage
            ? ACTIONS.flatMap((action): AppointmentActionItemView[] => {
                  const availability = detail.available_actions[action]
                  const key = ACTION_KEYS[action]

                  if (availability.allowed) {
                      return [{ kind: "button", action, label: t(`actions.buttons.${key}`) }]
                  }

                  if (
                      (action === "attended" || action === "no_show") &&
                      availability.code === WAITING_CODES[action]
                  ) {
                      const waitingKey = action === "attended" ? "attended" : "noShow"
                      return [{ kind: "waiting", action, text: t(`actions.waiting.${waitingKey}`) }]
                  }

                  return []
              })
            : []
        const finalKey = FINAL_KEYS[detail.status]

        if (canManage && detail.available_actions.cancel.allowed) {
            items.push({
                kind: "button",
                action: "cancel",
                label: t("actions.buttons.cancel")
            })
        }

        view = {
            items,
            finalText: finalKey ? t(finalKey) : null,
            readOnlyText: !canManage && active ? t("actions.readOnly") : null,
            cancelUnavailableText:
                canManage &&
                detail.available_actions.cancel.allowed === false &&
                detail.available_actions.cancel.code === "CANCEL_AFTER_START"
                    ? t("actions.cancel.afterStart")
                    : null,
            error: errorKey ? t(`common:${errorKey}`) : null
        }
    }

    let dialog = null

    if (detail !== undefined && pending !== null) {
        const key = ACTION_KEYS[pending]
        const description = t(`actions.confirm.${key}.description`, { protocol: detail.protocol })

        dialog = {
            title: t(`actions.confirm.${key}.title`),
            description:
                pending !== "claim" && pending !== "correct_record" && detail.status === "PENDING"
                    ? t("actions.confirm.alsoClaim", { description })
                    : description,
            confirmLabel: t(`actions.confirm.${key}.confirm`)
        }
    }

    const assignment = {
        available: canManage && detail?.available_actions.assign.allowed === true,
        staff: (staffQuery.currentData ?? []).filter((person) => person.active),
        loadingStaff: staffQuery.isFetching,
        staffError: staffQuery.isError,
        retryStaff: () => void staffQuery.refetch(),
        busy,
        selectedStaffId,
        setSelectedStaffId,
        assign: () => void assign(),
        noteText,
        setNoteText,
        notes: detail?.notes ?? [],
        canAddNote: canManage && detail?.available_actions.add_note.allowed === true,
        noteBusy,
        addNote: () => void addNote()
    }

    return { view, dialog, busy, open, cancel, confirm: () => void confirm(), assignment }
}

export default useAppointmentActions
