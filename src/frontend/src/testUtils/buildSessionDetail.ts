import type { SessionDetail, SessionTimelineItem } from "@/types/sessions/Session.types"

function buildTimelineItem(
    type: string,
    overrides: Partial<SessionTimelineItem> = {}
): SessionTimelineItem {
    return {
        id: `${type}-${overrides.created_at ?? "0"}`,
        type,
        created_at: "2026-11-10T17:05:00.000Z",
        category_name: null,
        question_title: null,
        data: {},
        appointment: null,
        ...overrides
    }
}

function buildSessionDetail(overrides: Partial<SessionDetail> = {}): SessionDetail {
    return {
        id: "1",
        code: "S-A1B2C3D4",
        started_at: "2026-11-10T17:05:00.000Z",
        ended_at: "2026-11-10T17:15:00.000Z",
        outcome: "SCHEDULED",
        current_step: null,
        category_name: "Consumo",
        question_title: "Como trocar um produto com defeito?",
        appointment: { id: "42", protocol: "AB12CD34", action: "CREATED" },
        timeline: [
            buildTimelineItem("STARTED", { created_at: "2026-11-10T17:05:00.000Z" }),
            buildTimelineItem("CATEGORY_CHOSEN", {
                created_at: "2026-11-10T17:06:00.000Z",
                category_name: "Consumo"
            }),
            buildTimelineItem("QUESTION_CHOSEN", {
                created_at: "2026-11-10T17:07:00.000Z",
                question_title: "Como trocar um produto com defeito?"
            }),
            buildTimelineItem("ANSWER_SENT", {
                created_at: "2026-11-10T17:08:00.000Z",
                data: { llm: "USED" }
            }),
            buildTimelineItem("SCHEDULE_OFFERED", {
                created_at: "2026-11-10T17:09:00.000Z",
                data: { reason: "NOT_RESOLVED" }
            }),
            buildTimelineItem("APPOINTMENT_CREATED", {
                created_at: "2026-11-10T17:12:00.000Z",
                appointment: { id: "42", protocol: "AB12CD34" }
            })
        ],
        other_sessions: [
            {
                id: "2",
                code: "S-ZZ99YY88",
                started_at: "2026-11-12T13:30:00.000Z",
                outcome: "MANAGED_APPOINTMENT"
            }
        ],
        anonymized: false,
        ...overrides
    }
}

export { buildTimelineItem }
export default buildSessionDetail
