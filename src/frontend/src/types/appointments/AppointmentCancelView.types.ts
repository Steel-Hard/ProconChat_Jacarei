type CancelReason = "UNIT_CLOSED" | "CITIZEN_REQUEST" | "DUPLICATE" | "OTHER"

type AppointmentCancelView = {
    open: boolean
    protocol: string
    subtitle: string
    reason: CancelReason | ""
    setReason: (reason: CancelReason | "") => void
    note: string
    setNote: (note: string) => void
    busy: boolean
    error: string | null
    preview: string | undefined
    previewLoading: boolean
    previewFailed: boolean
    retryPreview: () => void
    confirm: () => void
    close: () => void
}

export default AppointmentCancelView
