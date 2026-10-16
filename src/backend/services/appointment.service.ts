import BadRequestError from "../errors/BadRequestError"
import ConflictError from "../errors/ConflictError"
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
    isDateOnOrBeforeToday,
    isDatetimePast,
} from "../utils/date.utils"
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

        async getAppointmentDetail(
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
        },

        async claimAppointment(
            idOrCode: number | string,
            actorUserId: number,
            now: Date = new Date(),
        ): Promise<AppointmentDetail> {
            const appointment = await this.getAppointmentDetail(idOrCode)
            if (appointment.status === "CANCELED") {
                throw new ConflictError(
                    "Não é possível assumir um agendamento cancelado",
                    "APPOINTMENT_CANCELED",
                )
            }
            if (appointment.status === "ATTENDED") {
                throw new ConflictError(
                    "Agendamento já foi atendido",
                    "ALREADY_ATTENDED",
                )
            }
            if (appointment.status === "NO_SHOW") {
                throw new ConflictError(
                    "Agendamento já registrado como não compareceu",
                    "ALREADY_NO_SHOW",
                )
            }
            if (appointment.status !== "PENDING") {
                throw new ConflictError(
                    "Apenas agendamentos pendentes podem ser assumidos",
                    "APPOINTMENT_ALREADY_CLAIMED",
                )
            }
            return repository.claim(Number(appointment.id), actorUserId, now)
        },

        async markAttended(
            idOrCode: number | string,
            actorUserId: number,
            now: Date = new Date(),
        ): Promise<AppointmentDetail> {
            const appointment = await this.getAppointmentDetail(idOrCode)
            if (appointment.status === "ATTENDED") {
                throw new ConflictError(
                    "Agendamento já foi marcado como atendido",
                    "ALREADY_ATTENDED",
                )
            }
            if (appointment.status === "NO_SHOW") {
                throw new ConflictError(
                    "Agendamento já foi registrado como não compareceu",
                    "ALREADY_NO_SHOW",
                )
            }
            if (appointment.status === "CANCELED") {
                throw new ConflictError(
                    "Não é possível registrar atendimento para um agendamento cancelado",
                    "APPOINTMENT_CANCELED",
                )
            }
            if (appointment.status !== "PENDING" && appointment.status !== "CONFIRMED") {
                throw new ConflictError(
                    `Ação não permitida para agendamentos com status ${appointment.status}`,
                    "INVALID_STATUS_TRANSITION",
                )
            }
            const apptDate = new Date(appointment.appointment_datetime)
            if (!isDateOnOrBeforeToday(apptDate, now)) {
                throw new BadRequestError("Disponível a partir do dia do atendimento")
            }
            return repository.markAttended(Number(appointment.id), actorUserId, now)
        },

        async markNoShow(
            idOrCode: number | string,
            actorUserId: number,
            now: Date = new Date(),
        ): Promise<AppointmentDetail> {
            const appointment = await this.getAppointmentDetail(idOrCode)
            if (appointment.status === "ATTENDED") {
                throw new ConflictError(
                    "Agendamento já foi marcado como atendido",
                    "ALREADY_ATTENDED",
                )
            }
            if (appointment.status === "NO_SHOW") {
                throw new ConflictError(
                    "Agendamento já foi registrado como não compareceu",
                    "ALREADY_NO_SHOW",
                )
            }
            if (appointment.status === "CANCELED") {
                throw new ConflictError(
                    "Não é possível registrar como não compareceu para um agendamento cancelado",
                    "APPOINTMENT_CANCELED",
                )
            }
            if (appointment.status !== "PENDING" && appointment.status !== "CONFIRMED") {
                throw new ConflictError(
                    `Ação não permitida para agendamentos com status ${appointment.status}`,
                    "INVALID_STATUS_TRANSITION",
                )
            }
            const apptDatetime = new Date(appointment.appointment_datetime)
            if (!isDatetimePast(apptDatetime, now)) {
                throw new BadRequestError("Disponível apenas após o horário do agendamento")
            }
            return repository.markNoShow(Number(appointment.id), actorUserId, now)
        },
    }
}

export const appointmentService = createAppointmentService()
export default appointmentService
