import type AppointmentDetail from "@/types/appointments/AppointmentDetail.types"

function buildAppointmentDetail(overrides: Partial<AppointmentDetail> = {}): AppointmentDetail {
    return {
        id: "1",
        appointment_code: "f10464f0-81f5-400c-b45b-e841ab409255",
        protocol: "F10464F0",
        session_id: "1",
        status: "PENDING",
        name: "Maria Fictícia",
        cpf_masked: "***.982.247-**",
        by_representative: false,
        reason: "NOT_RESOLVED",
        appointment_datetime: "2026-10-19T11:00:00.000Z",
        rescheduled_from: null,
        off_grid: false,
        request_datetime: "2026-10-18T13:46:05.141Z",
        assigned_user_id: null,
        assigned_user_name: null,
        category_id: "1",
        category_name: "Cobrança/Desconto Indevido",
        question_id: "5",
        question_title: "Prescrição de dívida",
        documents_sent: {
            group: ["RG ou outro documento oficial com foto", "CPF", "Comprovante de endereço"],
            question: []
        },
        is_documents_config_different: false,
        events: [
            {
                id: "1",
                type: "CREATED",
                actor_user_id: null,
                actor_user_name: null,
                data: {},
                created_at: "2026-10-18T13:46:05.141Z"
            }
        ],
        timeline: [
            {
                id: "1",
                type: "STARTED",
                created_at: "2026-10-18T13:46:04.464Z",
                generated_by_ai: false,
                data: {}
            },
            {
                id: "2",
                type: "ANSWER_SENT",
                created_at: "2026-10-18T13:46:04.658Z",
                generated_by_ai: true,
                data: { llm: "USED", category_title: "Cobrança/Desconto Indevido" }
            },
            {
                id: "3",
                type: "APPOINTMENT_CREATED",
                created_at: "2026-10-18T13:46:05.141Z",
                generated_by_ai: false,
                data: { appointmentId: 1 }
            }
        ],
        available_actions: {
            claim: { allowed: true, code: null },
            attended: { allowed: false, code: "ATTENDANCE_NOT_YET_AVAILABLE" },
            no_show: { allowed: false, code: "NO_SHOW_NOT_YET_AVAILABLE" }
        },
        ...overrides
    }
}

export default buildAppointmentDetail
