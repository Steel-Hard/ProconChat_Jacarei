import type resources from "@/i18n/resources"

type HistoryEvents = (typeof resources)["pt-BR"]["appointmentDetail"]["history"]["events"]

type AppointmentEventLabel = {
    key: `history.events.${keyof HistoryEvents}.${"withActor" | "withoutActor"}`
    values: Record<string, string>
    highlight: boolean
}

export default AppointmentEventLabel
