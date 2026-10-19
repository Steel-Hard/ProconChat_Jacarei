import type AppointmentTableTexts from "@/types/appointments/AppointmentTableTexts.types"

const APPOINTMENT_TABLE_TEXTS: AppointmentTableTexts = {
    label: "Agendamentos",
    columns: {
        protocol: "Protocolo",
        holder: "Titular",
        category: "Categoria / pergunta",
        datetime: "Data e hora",
        representative: "Representante",
        responsible: "Responsável",
        status: "Status",
        compactDatetime: "Data · responsável",
        actions: "Ações"
    },
    arrows: { asc: "▲", desc: "▼" },
    row: {
        yes: "Sim",
        no: "Não",
        offGrid: "Fora da grade atual",
        byRepresentative: "Por representante",
        claim: "Assumir",
        separator: "·"
    }
}

export default APPOINTMENT_TABLE_TEXTS
