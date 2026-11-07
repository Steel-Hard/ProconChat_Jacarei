import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import useToast from "@/hooks/useToast"
import appointmentsApi from "@/store/api/appointments.api"
import type AppointmentDetail from "@/types/appointments/AppointmentDetail.types"
import type CancellationReason from "@/types/appointments/CancellationReason.types"
import appointmentActionErrorKey from "@/utils/appointmentActionErrorKey"

type Options = {
    detail: AppointmentDetail | undefined
    canManage: boolean
}

function useAppointmentCancellation({ detail, canManage }: Options) {
    const { t } = useTranslation(["appointmentDetail", "common"])
    const { showToast } = useToast()
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
        if (
            detail === undefined ||
            reason === "" ||
            !detail.available_actions.cancel.allowed ||
            inFlight.current ||
            previewQuery.currentData?.previews.find((preview) => preview.reason === reason) ===
                undefined
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
            showToast(t("common:appointmentActions.success.cancel", { protocol: detail.protocol }))
            setOpen(false)
        } else {
            setError(t(`common:${appointmentActionErrorKey(result.error)}`))
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
            showToast(t("common:appointmentActions.success.retryCancellationNotice"))
        } else {
            setRetryError(t(`common:${appointmentActionErrorKey(result.error)}`))
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
        retryPreview: () => void previewQuery.refetch(),
        cancelAppointment: () => void cancelAppointment(),
        canRetryNotice:
            canManage && detail?.available_actions.retry_cancellation_notice.allowed === true,
        retryBusy: retryState.isLoading,
        retryError,
        retryNotice: () => void retryNotice()
    }
}

export default useAppointmentCancellation
