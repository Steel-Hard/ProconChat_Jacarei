import type AppointmentListItem from "@/types/appointments/AppointmentListItem.types"

function buildAppointmentListItem(
    overrides: Partial<AppointmentListItem> = {}
): AppointmentListItem {
    return {
        id: "11",
        protocol: "AG-0011",
        appointment_code: "0011",
        name: "Maria Aparecida Santos",
        cpf_masked: "***.456.789-**",
        category_name: "Bancos",
        question_title: "Cobrança indevida no cartão",
        appointment_datetime: "2026-09-28T13:00:00.000Z",
        by_representative: false,
        assigned_user_id: null,
        assigned_user_name: null,
        status: "PENDING",
        off_grid: false,
        waiting_record: false,
        ...overrides
    }
}

export default buildAppointmentListItem
