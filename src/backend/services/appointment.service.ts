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

function buildTimeline(
    events: RecordedConversationEvent[],
    appointment: AppointmentDetail,
    titles?: { categories: Record<number, string>; questions: Record<number, string> },
): ConversationTimelineStep[] {
    return events.map((ev, index) => {
        let label: string = ev.type
        let generatedByAi = false

        switch (ev.type) {
            case "STARTED":
                label = "Início do atendimento"
                break
            case "CATEGORY_CHOSEN": {
                const catName =
                    (typeof ev.categoryId === "number" && titles?.categories[ev.categoryId]) ||
                    (Number(appointment.category_id) === ev.categoryId ? appointment.category_name : null)
                label = catName
                    ? `Categoria selecionada: ${catName}`
                    : `Categoria selecionada: ${ev.categoryId}`
                break
            }
            case "QUESTION_CHOSEN": {
                const qTitle =
                    (typeof ev.questionId === "number" && titles?.questions[ev.questionId]) ||
                    (Number(appointment.question_id) === ev.questionId ? appointment.question_title : null)
                label = qTitle
                    ? `Pergunta selecionada: ${qTitle}`
                    : `Pergunta selecionada: ${ev.questionId}`
                break
            }
            case "ANSWER_SENT":
                label = "Orientação enviada"
                generatedByAi = ev.llm === "USED"
                break
            case "RESOLVED_ANSWERED":
                label = ev.resolved
                    ? "Cidadão respondeu que a dúvida foi resolvida"
                    : "Cidadão respondeu que a dúvida não foi resolvida"
                break
            case "SCHEDULE_OFFERED":
                label = "Opção de agendamento presencial oferecida"
                break
            case "ATTENDEE_CHOSEN":
                label = ev.byRepresentative
                    ? "Comparecimento por representante"
                    : "Titular comparece"
                break
            case "PHONE_NOTICE_SHOWN":
                label = "Aviso de contato pelo WhatsApp exibido"
                break
            case "APPOINTMENT_CREATED":
                label = "Agendamento concluído"
                break
            case "APPOINTMENT_CONSULTED":
                label = "Agendamento consultado"
                break
            case "APPOINTMENT_RESCHEDULED":
                label = `Agendamento remarcado: de ${ev.from} para ${ev.to}`
                break
            case "APPOINTMENT_CANCELED":
                label = "Agendamento cancelado"
                break
            case "NO_SLOT":
                label = "Sem horários disponíveis"
                break
            case "SCHEDULE_DECLINED":
                label = "Agendamento presencial recusado"
                break
            case "ABANDONED":
                label = `Atendimento abandonado na etapa ${ev.step}`
                break
        }

        return {
            id: String(index + 1),
            type: ev.type,
            created_at:
                ev.createdAt instanceof Date
                    ? ev.createdAt.toISOString()
                    : new Date(ev.createdAt).toISOString(),
            data: { ...(ev as unknown as Record<string, unknown>) },
            label,
            generated_by_ai: generatedByAi,
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
                        if (ev.type === "CATEGORY_CHOSEN" && typeof ev.categoryId === "number") {
                            categoryIds.push(ev.categoryId)
                        }
                        if (ev.type === "QUESTION_CHOSEN" && typeof ev.questionId === "number") {
                            questionIds.push(ev.questionId)
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
