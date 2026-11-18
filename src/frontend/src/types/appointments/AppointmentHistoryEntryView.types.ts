type AppointmentHistoryEntryView = {
    id: string
    text: string
    when: string
    highlight: boolean
    retryable: boolean
    muted: boolean
    detail: string | null
}

export default AppointmentHistoryEntryView
