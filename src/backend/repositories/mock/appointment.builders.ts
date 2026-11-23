import type { ConversationEventService } from "../../services/conversationEvent.service"
import type {
    AppointmentChipCounts,
    AppointmentDetailRecord,
    AppointmentListItem,
} from "../../types/appointment.types"
import type { RecordedConversationEvent } from "../../types/conversationEvent.types"

export const FIXED_NOW = new Date("2026-10-20T13:00:00.000Z")

export const FIXED_DATES = {
    fourDaysAgo: "2026-10-16T18:00:00.000Z",
    threeDaysAgo: "2026-10-17T14:00:00.000Z",
    yesterday: "2026-10-19T12:00:00.000Z",
    todayEarly: "2026-10-20T11:00:00.000Z",
    todayAfternoon: "2026-10-20T18:00:00.000Z",
    todayLate: "2026-10-21T02:59:00.000Z",
    tomorrow: "2026-10-21T13:00:00.000Z",
    afterTomorrow: "2026-10-22T17:00:00.000Z",
    inThreeDays: "2026-10-23T19:00:00.000Z",
}

export function buildAppointmentDetail(overrides: Partial<AppointmentDetailRecord> = {}): AppointmentDetailRecord {
    return {
        id: "1",
        appointment_code: "a1b2c3d4-0000-0000-0000-000000000001",
        protocol: "A1B2C3D4",
        session_id: "101",
        status: "PENDING",
        name: "Maria Silva",
        cpf_masked: "***.444.777-**",
        by_representative: false,
        reason: "NOT_RESOLVED",
        appointment_datetime: FIXED_DATES.tomorrow,
        rescheduled_from: null,
        off_grid: false,
        request_datetime: FIXED_NOW.toISOString(),
        assigned_user_id: null,
        assigned_user_name: null,
        category_id: "10",
        category_name: "Cobrança",
        question_id: "1",
        question_title: "Cobrança indevida de serviço não contratado",
        documents_sent: {
            group: ["Documento oficial com foto (RG ou CNH)", "Comprovante de residência em Jacareí"],
            question: ["Contrato de prestação de serviços", "Comprovante de pagamento"],
        },
        is_documents_config_different: false,
        events: [
            {
                id: "1",
                type: "CREATED",
                actor_user_id: null,
                actor_user_name: null,
                data: {},
                created_at: FIXED_NOW.toISOString(),
            },
        ],
        notes: [],
        timeline: [],
        ...overrides,
    }
}

export function buildListItem(overrides: Partial<AppointmentListItem> = {}): AppointmentListItem {
    return {
        id: "1",
        protocol: "A1B2C3D4",
        appointment_code: "a1b2c3d4-0000-0000-0000-000000000001",
        name: "Maria Silva",
        cpf_masked: "***.444.777-**",
        category_name: "Cobrança",
        question_title: "Cobrança indevida de serviço não contratado",
        appointment_datetime: FIXED_DATES.tomorrow,
        by_representative: false,
        assigned_user_id: null,
        assigned_user_name: null,
        status: "PENDING",
        off_grid: false,
        waiting_record: false,
        ...overrides,
    }
}

export function buildChipCounts(overrides: Partial<AppointmentChipCounts> = {}): AppointmentChipCounts {
    return {
        all: 0,
        pending: 0,
        confirmed: 0,
        attended: 0,
        no_show: 0,
        canceled: 0,
        waiting_record: 0,
        ...overrides,
    }
}

export function conversationTimelineEvents(sessionId: string): Record<string, RecordedConversationEvent[]> {
    const createdAt = FIXED_NOW
    return {
        [sessionId]: [
            { type: "STARTED", createdAt },
            { type: "CATEGORY_CHOSEN", categoryId: 10, createdAt },
            { type: "QUESTION_CHOSEN", categoryId: 10, questionId: 1, createdAt },
            { type: "ANSWER_SENT", categoryId: 10, questionId: 1, llm: "USED", createdAt },
            { type: "RESOLVED_ANSWERED", resolved: false, createdAt },
            { type: "SCHEDULE_OFFERED", reason: "NOT_RESOLVED", createdAt },
            { type: "ATTENDEE_CHOSEN", byRepresentative: false, createdAt },
            { type: "APPOINTMENT_CREATED", appointmentId: 1, createdAt },
        ],
    }
}

export function conversationEventsOf(
    eventsBySession: Record<string, RecordedConversationEvent[]>,
): ConversationEventService {
    return {
        record: async () => {},
        finish: async () => {},
        listBySession: async (sessionId: string) => [...(eventsBySession[sessionId] ?? [])],
    }
}
