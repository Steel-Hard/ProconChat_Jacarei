import { useCallback, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import useToast from "@/hooks/useToast"
import appointmentsApi from "@/store/api/appointments.api"
import type AppointmentAction from "@/types/appointments/AppointmentAction.types"
import type AppointmentActionItemView from "@/types/appointments/AppointmentActionItemView.types"
import type AppointmentActionsView from "@/types/appointments/AppointmentActionsView.types"
import type AppointmentDetail from "@/types/appointments/AppointmentDetail.types"
import type AppointmentStatus from "@/types/status/AppointmentStatus.types"
import appointmentActionErrorKey from "@/utils/appointmentActionErrorKey"

type ActionKey = "claim" | "attended" | "noShow"
type ErrorKey = ReturnType<typeof appointmentActionErrorKey>

type Options = {
    detail: AppointmentDetail | undefined
    canManage: boolean
    refetch: () => Promise<unknown>
}

const ACTIONS: AppointmentAction[] = ["claim", "attended", "no_show"]

const ACTION_KEYS: Record<AppointmentAction, ActionKey> = {
    claim: "claim",
    attended: "attended",
    no_show: "noShow"
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

function useAppointmentActions({ detail, canManage, refetch }: Options) {
    const { t } = useTranslation(["appointmentDetail", "common"])
    const { showToast } = useToast()
    const [updateStatus] = appointmentsApi.useUpdateAppointmentStatusMutation()
    const [pending, setPending] = useState<AppointmentAction | null>(null)
    const [busy, setBusy] = useState(false)
    const [errorKey, setErrorKey] = useState<ErrorKey | null>(null)
    const inFlight = useRef(false)

    const open = useCallback((action: AppointmentAction) => setPending(action), [])

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

        if ("data" in result) {
            showToast(
                t(`common:appointmentActions.success.${action}`, { protocol: detail.protocol })
            )
        } else {
            const status = statusOf(result.error)

            if (status !== 403 && status !== 404) {
                await refetch()
            }

            setErrorKey(appointmentActionErrorKey(result.error))
        }

        inFlight.current = false
        setBusy(false)
        setPending(null)
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

                  if (key !== "claim" && availability.code === WAITING_CODES[action]) {
                      return [{ kind: "waiting", action, text: t(`actions.waiting.${key}`) }]
                  }

                  return []
              })
            : []
        const finalKey = FINAL_KEYS[detail.status]

        view = {
            items,
            finalText: finalKey ? t(finalKey) : null,
            readOnlyText: !canManage && active ? t("actions.readOnly") : null,
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
                pending !== "claim" && detail.status === "PENDING"
                    ? t("actions.confirm.alsoClaim", { description })
                    : description,
            confirmLabel: t(`actions.confirm.${key}.confirm`)
        }
    }

    return { view, dialog, busy, open, cancel, confirm: () => void confirm() }
}

export default useAppointmentActions
