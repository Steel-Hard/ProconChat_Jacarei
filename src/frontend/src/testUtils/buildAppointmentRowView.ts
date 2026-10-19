import type AppointmentRowView from "@/types/appointments/AppointmentRowView.types"

function buildAppointmentRowView(overrides: Partial<AppointmentRowView> = {}): AppointmentRowView {
    return {
        id: "11",
        protocol: "AG-0011",
        name: "Maria Aparecida Santos",
        cpfMasked: "***.456.789-**",
        category: "Bancos",
        question: "Cobrança indevida no cartão",
        dayLabel: "Seg, 28/09",
        timeLabel: "10:00",
        representative: false,
        responsibleLabel: "Sem responsável",
        unassigned: true,
        status: "PENDING",
        offGrid: false,
        canClaim: false,
        claiming: false,
        detailPath: "/agendamentos/11",
        ...overrides
    }
}

export default buildAppointmentRowView
