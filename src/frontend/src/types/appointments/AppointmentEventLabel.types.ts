import type resources from "@/i18n/resources"

type HistoryEvents = (typeof resources)["pt-BR"]["appointmentDetail"]["history"]["events"]

type AppointmentEventLabel = {
    key: `history.events.${keyof HistoryEvents}.${"withActor" | "withoutActor"}`
    values: Record<string, string>
    highlight: boolean
    retryable: boolean
    muted: boolean
    detailKey:
        | `history.metaErrors.${"131042" | "132001" | "132000" | "132012" | "132007" | "132015" | "132016" | "132005" | "190" | "131048" | "131026" | "131049" | "131056" | "131047"}`
        | null
}

export default AppointmentEventLabel
