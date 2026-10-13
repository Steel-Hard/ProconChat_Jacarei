import getPool from "../db/connection"
import type { ConversationEvent } from "../types/conversationEvent.types"

export interface ConversationEventRepository {
    record(sessionId: string, event: ConversationEvent): Promise<void>
}

export const conversationEventRepository: ConversationEventRepository = {
    async record(sessionId, event): Promise<void> {
        const categoryId =
            event.type === "CATEGORY_CHOSEN" ||
            event.type === "QUESTION_CHOSEN" ||
            event.type === "ANSWER_SENT"
                ? event.categoryId
                : null
        const questionId =
            event.type === "QUESTION_CHOSEN" || event.type === "ANSWER_SENT"
                ? event.questionId
                : null
        const appointmentId =
            event.type === "APPOINTMENT_CREATED" ||
            event.type === "APPOINTMENT_CONSULTED" ||
            event.type === "APPOINTMENT_RESCHEDULED" ||
            event.type === "APPOINTMENT_CANCELED"
                ? event.appointmentId
                : null
        let data: Record<string, string | number | boolean> = {}

        switch (event.type) {
            case "ANSWER_SENT":
                data = { llm: event.llm }
                break
            case "RESOLVED_ANSWERED":
                data = { resolved: event.resolved }
                break
            case "ATTENDEE_CHOSEN":
                data = { by_representative: event.byRepresentative }
                break
            case "ABANDONED":
                data = { step: event.step }
                break
        }

        await getPool().query(
            `INSERT INTO ConversationEvents
                (session_id, type, category_id, question_id, appointment_id, data)
             VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
            [sessionId, event.type, categoryId, questionId, appointmentId, JSON.stringify(data)],
        )
    },
}
