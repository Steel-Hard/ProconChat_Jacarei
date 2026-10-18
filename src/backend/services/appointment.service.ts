import NotFoundError from "../errors/NotFoundError"
import { AppointmentRepository } from "../repositories/appointment.repository.interface"
import { appointmentRepository as defaultAppointmentRepository } from "../repositories/appointment.repository"
import {
    AppointmentDetail,
    AppointmentListFilters,
    AppointmentListResponse,
    ConversationTimelineStep,
} from "../types/appointment.types"
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
    ): Promise<AppointmentDetail>

    claimAppointment(
        idOrCode: number | string,
        actorUserId: number,
        now?: Date,
    ): Promise<AppointmentDetail>

    markAttended(
        idOrCode: number | string,
        actorUserId: number,
        now?: Date,
    ): Promise<AppointmentDetail>

    markNoShow(
        idOrCode: number | string,
        actorUserId: number,
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
    appointment: AppointmentDetail,
    titles: TimelineTitles,
): string | null {
    return (
        titles.categories[categoryId] ??
        (Number(appointment.category_id) === categoryId ? appointment.category_name : null)
    )
}

function questionTitle(
    questionId: number,
    appointment: AppointmentDetail,
    titles: TimelineTitles,
): string | null {
    return (
        titles.questions[questionId] ??
        (Number(appointment.question_id) === questionId ? appointment.question_title : null)
    )
}

function buildTimeline(
    events: RecordedConversationEvent[],
    appointment: AppointmentDetail,
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

export function createAppointmentService(deps?: {
    repository?: AppointmentRepository
    conversationEvents?: ConversationEventService
}): AppointmentService {
    const repository = deps?.repository ?? defaultAppointmentRepository
    const conversationEvents = deps?.conversationEvents ?? defaultConversationEventService

    async function getAppointmentDetail(
        idOrCode: number | string,
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
                console.error("Erro ao listar eventos da conversa para a linha do tempo:", error)
            }
        }

        return appointment
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
            now: Date = new Date(),
        ): Promise<AppointmentDetail> {
            await repository.claim(String(idOrCode), actorUserId, now)
            return getAppointmentDetail(idOrCode)
        },

        async markAttended(
            idOrCode: number | string,
            actorUserId: number,
            now: Date = new Date(),
        ): Promise<AppointmentDetail> {
            await repository.markAttended(String(idOrCode), actorUserId, now)
            return getAppointmentDetail(idOrCode)
        },

        async markNoShow(
            idOrCode: number | string,
            actorUserId: number,
            now: Date = new Date(),
        ): Promise<AppointmentDetail> {
            await repository.markNoShow(String(idOrCode), actorUserId, now)
            return getAppointmentDetail(idOrCode)
        },
    }
}

export const appointmentService = createAppointmentService()
export default appointmentService
