import type { SessionStep } from "../repositories/session.repository"

export type ConversationEvent =
    | { type: "STARTED" }
    | { type: "CATEGORY_CHOSEN"; categoryId: number }
    | { type: "QUESTION_CHOSEN"; categoryId: number; questionId: number }
    | {
          type: "ANSWER_SENT"
          categoryId: number
          questionId: number
          llmStatus: "NOT_CALLED" | "USED" | "FAILED"
      }
    | { type: "RESOLVED_ANSWERED"; resolved: boolean }
    | { type: "SCHEDULE_OFFERED" }
    | { type: "NO_SLOT" }
    | { type: "SCHEDULE_DECLINED" }
    | { type: "ATTENDEE_CHOSEN"; byRepresentative: boolean }
    | { type: "PHONE_NOTICE_SHOWN" }
    | { type: "APPOINTMENT_CREATED"; appointmentId: number }
    | { type: "APPOINTMENT_CONSULTED"; appointmentId: number }
    | { type: "APPOINTMENT_RESCHEDULED"; appointmentId: number }
    | { type: "APPOINTMENT_CANCELED"; appointmentId: number }
    | { type: "ABANDONED"; step: SessionStep }
