import NotFoundError from "../errors/NotFoundError"
import { AppointmentRepository } from "../repositories/appointment.repository.interface"
import { appointmentRepository as defaultAppointmentRepository } from "../repositories/appointment.repository"
import {
    AppointmentDetail,
    AppointmentDetailRecord,
    AppointmentListFilters,
    AppointmentListResponse,
    ConversationTimelineStep,
} from "../types/appointment.types"
import { errorCodeOf } from "../utils/conversationEventLog"
import { ActionAccess, availableActions } from "./appointmentTransitions"
import {
    conversationEventService as defaultConversationEventService,
    ConversationEventService,
} from "./conversationEvent.service"
import type { RecordedConversationEvent } from "../types/conversationEvent.types"

export interface AppointmentService {
    listAppointments(
        filters: AppointmentListFilters,
        now?: Date,
    ): Promise<AppointmentListResponse>

    getPendingCount(): Promise<{ count: number }>

    getAppointmentDetail(
        idOrCode: number | string,
        access: ActionAccess,
        now?: Date,
    ): Promise<AppointmentDetail>

    claimAppointment(
        idOrCode: number | string,
        actorUserId: number,
        access: ActionAccess,
        now?: Date,
    ): Promise<AppointmentDetail>

    markAttended(
        idOrCode: number | string,
        actorUserId: number,
        access: ActionAccess,
        now?: Date,
    ): Promise<AppointmentDetail>

    markNoShow(
        idOrCode: number | string,
        actorUserId: number,
        access: ActionAccess,
        now?: Date,
    ): Promise<AppointmentDetail>
}

type TimelineTitles = { categories: Record<number, string>; questions: Record<number, string> }

function idOf(ev: RecordedConversationEvent, key: "categoryId" | "questionId"): number | null {
    const value = (ev as Record<string, unknown>)[key]
    return typeof value === "number" ? value : null
}

function categoryTitle(
    categoryId: number,
    appointment: AppointmentDetailRecord,
    titles: TimelineTitles,
): string | null {
    return (
        titles.categories[categoryId] ??
        (Number(appointment.category_id) === categoryId ? appointment.category_name : null)
    )
}

function questionTitle(
    questionId: number,
    appointment: AppointmentDetailRecord,
    titles: TimelineTitles,
): string | null {
    return (
        titles.questions[questionId] ??
        (Number(appointment.question_id) === questionId ? appointment.question_title : null)
    )
}

function buildTimeline(
    events: RecordedConversationEvent[],
    appointment: AppointmentDetailRecord,
    titles: TimelineTitles,
): ConversationTimelineStep[] {
    return events.map((ev, index) => {
        const { type, createdAt, ...fields } = ev
        const data: Record<string, unknown> = { ...fields }

        const categoryId = idOf(ev, "categoryId")
        if (categoryId !== null) {
            data.category_title = categoryTitle(categoryId, appointment, titles)
        }
        const questionId = idOf(ev, "questionId")
        if (questionId !== null) {
            data.question_title = questionTitle(questionId, appointment, titles)
        }

        return {
            id: String(index + 1),
            type,
            created_at:
                createdAt instanceof Date
                    ? createdAt.toISOString()
                    : new Date(createdAt).toISOString(),
            generated_by_ai: ev.type === "ANSWER_SENT" && ev.llm === "USED",
            data,
        }
    })
}

export interface AppointmentTimelineFailureLog {
    appointmentId: string
    code: string
}

export interface AppointmentServiceLogger {
    error(message: string, details: AppointmentTimelineFailureLog): void
}

export function createAppointmentService(deps?: {
    repository?: AppointmentRepository
    conversationEvents?: ConversationEventService
    logger?: AppointmentServiceLogger
}): AppointmentService {
    const repository = deps?.repository ?? defaultAppointmentRepository
    const conversationEvents = deps?.conversationEvents ?? defaultConversationEventService
    const logger = deps?.logger ?? console

    async function getAppointmentDetail(
        idOrCode: number | string,
        access: ActionAccess,
        now: Date = new Date(),
    ): Promise<AppointmentDetail> {
        const appointment = await repository.findById(idOrCode)
        if (!appointment) {
            throw new NotFoundError("Agendamento não encontrado")
        }

        if (appointment.session_id) {
            try {
                const events = await conversationEvents.listBySession(appointment.session_id)
                if (events && events.length > 0) {
                    const categoryIds: number[] = []
                    const questionIds: number[] = []
                    for (const ev of events) {
                        const categoryId = idOf(ev, "categoryId")
                        if (categoryId !== null && !categoryIds.includes(categoryId)) {
                            categoryIds.push(categoryId)
                        }
                        const questionId = idOf(ev, "questionId")
                        if (questionId !== null && !questionIds.includes(questionId)) {
                            questionIds.push(questionId)
                        }
                    }
                    const titles = await repository.resolveTitles(categoryIds, questionIds)
                    appointment.timeline = buildTimeline(events, appointment, titles)
                }
            } catch (error) {
                logger.error("Erro ao listar eventos da conversa para a linha do tempo", {
                    appointmentId: appointment.id,
                    code: errorCodeOf(error),
                })
            }
        }

        return {
            ...appointment,
            available_actions: availableActions(
                {
                    status: appointment.status,
                    appointmentDatetime: new Date(appointment.appointment_datetime),
                },
                now,
                access,
            ),
        }
    }

    return {
        async listAppointments(
            filters: AppointmentListFilters,
            now: Date = new Date(),
        ): Promise<AppointmentListResponse> {
            const page = filters.page && filters.page > 0 ? filters.page : 1
            const limit = filters.limit && filters.limit > 0 ? filters.limit : 20

            const { items, total, chipCounts } = await repository.findList(
                { ...filters, page, limit },
                now,
            )

            const totalPages = Math.ceil(total / limit) || 1

            return {
                items,
                total,
                page,
                limit,
                totalPages,
                chipCounts,
            }
        },

        async getPendingCount(): Promise<{ count: number }> {
            const count = await repository.countPending()
            return { count }
        },

        getAppointmentDetail,

        async claimAppointment(
            idOrCode: number | string,
            actorUserId: number,
            access: ActionAccess,
            now: Date = new Date(),
        ): Promise<AppointmentDetail> {
            await repository.claim(String(idOrCode), actorUserId, now)
            return getAppointmentDetail(idOrCode, access, now)
        },

        async markAttended(
            idOrCode: number | string,
            actorUserId: number,
            access: ActionAccess,
            now: Date = new Date(),
        ): Promise<AppointmentDetail> {
            await repository.markAttended(String(idOrCode), actorUserId, now)
            return getAppointmentDetail(idOrCode, access, now)
        },

        async markNoShow(
            idOrCode: number | string,
            actorUserId: number,
            access: ActionAccess,
            now: Date = new Date(),
        ): Promise<AppointmentDetail> {
            await repository.markNoShow(String(idOrCode), actorUserId, now)
            return getAppointmentDetail(idOrCode, access, now)
        },
    }
}

export const appointmentService = createAppointmentService()
export default appointmentService
