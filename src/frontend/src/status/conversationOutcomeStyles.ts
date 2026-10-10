import type ConversationOutcome from "@/types/status/ConversationOutcome.types"
import type ConversationOutcomeStyle from "@/types/status/ConversationOutcomeStyle.types"

const CONVERSATION_OUTCOME: Record<ConversationOutcome, ConversationOutcomeStyle> = {
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

export default CONVERSATION_OUTCOME
