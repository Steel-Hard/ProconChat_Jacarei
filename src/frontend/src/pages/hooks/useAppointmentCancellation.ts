import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import useToast from "@/hooks/useToast"
import appointmentsApi from "@/store/api/appointments.api"
import useAppDispatch from "@/store/useAppDispatch"
import type AppointmentDetail from "@/types/appointments/AppointmentDetail.types"
import type CancellationReason from "@/types/appointments/CancellationReason.types"
import appointmentActionErrorKey from "@/utils/appointmentActionErrorKey"
import cancellationNoticeOutcomeOf from "@/utils/cancellationNoticeOutcomeOf"
import errorStatusOf from "@/utils/errorStatusOf"

type Options = {
    detail: AppointmentDetail | undefined
    canManage: boolean
}

const WARNING_KEYS = {
    failed: "cancelNoticeFailed",
    noPhone: "cancelNoticeNoPhone",
    disabled: "cancelNoticeDisabled",
    ok: "cancelNoticeFailed"
} as const

function useAppointmentCancellation({ detail, canManage }: Options) {
    const { t } = useTranslation(["appointmentDetail", "common"])
    const { showToast } = useToast()
    const dispatch = useAppDispatch()
    const [open, setOpen] = useState(false)
    const [reason, setReason] = useState<CancellationReason | "">("")
    const [note, setNote] = useState("")
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [retryError, setRetryError] = useState<string | null>(null)
    const inFlight = useRef(false)
    const previewQuery = appointmentsApi.useGetCancellationPreviewQuery(detail?.id ?? "", {
        skip: !open || !canManage || detail === undefined
    })
    const [updateStatus] = appointmentsApi.useUpdateAppointmentStatusMutation()
    const [retryMutation, retryState] = appointmentsApi.useRetryCancellationNoticeMutation()

    async function reloadDetail(id: string, failure: unknown) {
        const status = errorStatusOf(failure)

        if (status !== 403 && status !== 404) {
            await dispatch(
                appointmentsApi.endpoints.getAppointment.initiate(id, {
                    subscribe: false,
                    forceRefetch: true
                })
            )
        }
    }

    function openDialog() {
        if (canManage && detail?.available_actions.cancel.allowed) {
            setReason("")
            setNote("")
            setError(null)
            setOpen(true)
        }
    }

    function closeDialog() {
        if (!inFlight.current) {
            setOpen(false)
            setError(null)
        }
    }

    async function cancelAppointment() {
        const config = previewQuery.currentData
        const hasPreview =
            config?.noticeEnabled === false ||
            config?.previews.find((preview) => preview.reason === reason) !== undefined

        if (
            detail === undefined ||
            reason === "" ||
            !detail.available_actions.cancel.allowed ||
            inFlight.current ||
            !hasPreview
        ) {
            return
        }

        inFlight.current = true
        setBusy(true)
        setError(null)
        const result = await updateStatus({
            id: detail.id,
            action: "cancel",
            reason,
            ...(note.trim() ? { note: note.trim() } : {})
        })

        if ("data" in result && result.data !== undefined) {
            if (cancellationNoticeOutcomeOf(result.data) === "ok") {
                showToast(
                    t("common:appointmentActions.success.cancel", { protocol: detail.protocol })
                )
            }

            setOpen(false)
        } else {
            setError(t(`common:${appointmentActionErrorKey(result.error)}`))
            await reloadDetail(detail.id, result.error)
        }

        inFlight.current = false
        setBusy(false)
    }

    async function retryNotice() {
        if (
            detail === undefined ||
            !detail.available_actions.retry_cancellation_notice.allowed ||
            inFlight.current
        ) {
            return
        }

        inFlight.current = true
        setRetryError(null)
        const result = await retryMutation(detail.id)

        if ("data" in result && result.data !== undefined) {
            if (cancellationNoticeOutcomeOf(result.data) === "ok") {
                showToast(t("common:appointmentActions.success.retryCancellationNotice"))
            } else {
                setRetryError(t("common:appointmentActions.errors.retryNoticeFailed"))
            }
        } else {
            setRetryError(t(`common:${appointmentActionErrorKey(result.error)}`))
            await reloadDetail(detail.id, result.error)
        }

        inFlight.current = false
    }

    return {
        open,
        openDialog,
        closeDialog,
        reason,
        setReason,
        note,
        setNote,
        busy,
        error,
        preview:
            reason === ""
                ? undefined
                : previewQuery.currentData?.previews.find((preview) => preview.reason === reason)
                      ?.message,
        previewLoading: previewQuery.isFetching,
        previewFailed: previewQuery.isError,
        noticeDisabled: previewQuery.currentData?.noticeEnabled === false,
        problemCode: previewQuery.currentData?.noticeEnabled
            ? (previewQuery.currentData.problem?.code ?? null)
            : null,
        retryPreview: () => void previewQuery.refetch(),
        cancelAppointment: () => void cancelAppointment(),
        canRetryNotice:
            canManage &&
            detail?.available_actions.retry_cancellation_notice.allowed === true &&
            detail.cancellation_notice_status !== "DISABLED" &&
            detail.cancellation_notice_status !== "NOTIFIED",
        failedNotice:
            detail !== undefined && cancellationNoticeOutcomeOf(detail) !== "ok"
                ? t(
                      `common:appointmentActions.warnings.${WARNING_KEYS[cancellationNoticeOutcomeOf(detail)]}`,
                      {
                          protocol: detail.protocol
                      }
                  )
                : null,
        retryBusy: retryState.isLoading,
        retryError,
        retryNotice: () => void retryNotice()
    }
}

export default useAppointmentCancellation
