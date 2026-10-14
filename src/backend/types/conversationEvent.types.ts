import type { SessionStep } from "../repositories/session.repository"

export type LlmStatus = "NOT_CALLED" | "USED" | "FAILED"

export type ScheduleOfferReason = "REQUIRES_IN_PERSON" | "NOT_RESOLVED"

export type AbandonedStep = Exclude<SessionStep, "FINISHED">

export type ConversationEvent =
    | { type: "STARTED" }
    | { type: "CATEGORY_CHOSEN"; categoryId: number }
    | { type: "QUESTION_CHOSEN"; categoryId: number; questionId: number }
    | { type: "ANSWER_SENT"; categoryId: number; questionId: number; llm: LlmStatus }
    | { type: "RESOLVED_ANSWERED"; resolved: boolean }
    | { type: "SCHEDULE_OFFERED"; reason: ScheduleOfferReason }
    | { type: "NO_SLOT" }
    | { type: "SCHEDULE_DECLINED" }
    | { type: "ATTENDEE_CHOSEN"; byRepresentative: boolean }
    | { type: "PHONE_NOTICE_SHOWN" }
    | { type: "APPOINTMENT_CREATED"; appointmentId: number }
    | { type: "APPOINTMENT_CONSULTED"; appointmentId: number }
    | { type: "APPOINTMENT_RESCHEDULED"; appointmentId: number; from: string; to: string }
    | { type: "APPOINTMENT_CANCELED"; appointmentId: number }
    | { type: "ABANDONED"; step: AbandonedStep }

export type ConversationEventType = ConversationEvent["type"]

export type FinishedOutcome =
    | "RESOLVED"
    | "SCHEDULED"
    | "OUT_OF_SCOPE"
    | "NO_SLOT"
    | "DECLINED"
    | "MANAGED_APPOINTMENT"

export interface SessionClosing {
    outcome: FinishedOutcome
    event: ConversationEvent
}

export type RecordedConversationEvent = ConversationEvent & { createdAt: Date }

export type ConversationEventData = Record<string, string | boolean>

export interface ConversationEventRow {
    sessionId: string
    type: ConversationEventType
    categoryId: number | null
    questionId: number | null
    appointmentId: number | null
    data: ConversationEventData
}

export interface StoredConversationEventRow {
    type: string
    category_id: string | number | null
    question_id: string | number | null
    appointment_id: string | number | null
    data: unknown
    created_at: Date
}
