export type AppointmentStatus = "PENDING" | "CONFIRMED" | "ATTENDED" | "NO_SHOW" | "CANCELED"

export type ConversationOutcome =
    | "RESOLVED"
    | "SCHEDULED"
    | "OUT_OF_SCOPE"
    | "NO_SLOT"
    | "DECLINED"
    | "MANAGED_APPOINTMENT"
    | "ABANDONED"
    | "IN_PROGRESS"

export type AppointmentStatusStyle = {
    label: string
    bg: string
    fg: string
    border: string
}

export type ConversationOutcomeStyle = {
    label: string
    bg: string
    fg: string
    chart: string
}

export const APPOINTMENT_STATUS: Record<AppointmentStatus, AppointmentStatusStyle> = {
    PENDING: { label: "Pendente", bg: "#FCEFD6", fg: "#7A4F00", border: "#E9C98A" },
    CONFIRMED: { label: "Confirmado", bg: "#E6E2F6", fg: "#3A3072", border: "#BDB3E6" },
    ATTENDED: { label: "Atendido", bg: "#DFF1E6", fg: "#1B6138", border: "#A9D6BA" },
    NO_SHOW: { label: "Não compareceu", bg: "#FBE6DC", fg: "#8A3A12", border: "#EDB9A0" },
    CANCELED: { label: "Cancelado", bg: "#EDECF1", fg: "#55516A", border: "#CFCDD8" }
}

export const CONVERSATION_OUTCOME: Record<ConversationOutcome, ConversationOutcomeStyle> = {
    RESOLVED: {
        label: "Resolvida sem agendamento",
        bg: "#DFF1E6",
        fg: "#1B6138",
        chart: "#3F8F63"
    },
    SCHEDULED: { label: "Terminou em agendamento", bg: "#E6E2F6", fg: "#3A3072", chart: "#483D8B" },
    OUT_OF_SCOPE: {
        label: "Fora do escopo do PROCON",
        bg: "#EDECF1",
        fg: "#55516A",
        chart: "#8A84AB"
    },
    NO_SLOT: {
        label: "Sem horário disponível na janela",
        bg: "#FAE3E0",
        fg: "#8E2C22",
        chart: "#C0392B"
    },
    DECLINED: { label: "Não quis agendar", bg: "#FCEFD6", fg: "#7A4F00", chart: "#D99A1E" },
    MANAGED_APPOINTMENT: {
        label: "Remarcou ou cancelou agendamento existente",
        bg: "#DDF0EE",
        fg: "#1F5E57",
        chart: "#6FA8A0"
    },
    ABANDONED: { label: "Abandonada", bg: "#F6E6E2", fg: "#7C3A2E", chart: "#C98A7E" },
    IN_PROGRESS: { label: "Em andamento", bg: "#DDEBF8", fg: "#1D5288", chart: "#5B8DC9" }
}

export const APPOINTMENT_STATUS_ORDER: AppointmentStatus[] = [
    "PENDING",
    "CONFIRMED",
    "ATTENDED",
    "NO_SHOW",
    "CANCELED"
]

export const CONVERSATION_OUTCOME_ORDER: ConversationOutcome[] = [
    "RESOLVED",
    "SCHEDULED",
    "OUT_OF_SCOPE",
    "NO_SLOT",
    "DECLINED",
    "MANAGED_APPOINTMENT",
    "ABANDONED",
    "IN_PROGRESS"
]
