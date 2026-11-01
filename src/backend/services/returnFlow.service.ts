import AppointmentNotChangeableError from "../errors/AppointmentNotChangeableError"
import DuplicateAppointmentError from "../errors/DuplicateAppointmentError"
import SlotFullError from "../errors/SlotFullError"
import type { ActiveSession, ActiveSessionStep, SessionRepository } from "../repositories/session.repository"
import type { ConversationFlowResult, ScheduleProvider } from "../types/conversationFlow.types"
import type { OutgoingMessage } from "../types/message.types"
import type {
    AvailableSlot,
    CitizenCancelResult,
    CitizenRescheduleResult,
    ReturningAppointment,
} from "../types/schedule.types"
import {
    AGENDAMENTO_NAO_ALTERAVEL,
    CONFIRMA_CANCELAMENTO,
    criarBotoesConfirmaCancelamento,
    criarBotoesRetorno,
    criarMensagensSlots,
    ERRO_CONFIRMA_CANCELAMENTO,
    ERRO_DUPLICATE_APPOINTMENT,
    ERRO_FALHA_ALTERACAO,
    ERRO_MENU_RETORNO,
    ERRO_SLOT_OCUPADO,
    formatarConfirmacaoAgendamento,
    formatarErroSlot,
    formatarListaSlots,
    formatarQuando,
    MENU_RETORNO,
    paginarItens,
    RESPOSTA_CANCELADO,
    RODAPE_RETORNO,
    SEM_HORARIOS_REMARCACAO,
    TEXTO_BOTOES_RETORNO,
} from "./messageFormatter.service"
import {
    conversationEventFailureLog,
    ConversationEventLogger,
    ConversationEventService,
} from "./conversationEvent.service"

interface ReturnFlowDependencies {
    sessions: SessionRepository
    events: ConversationEventService
    schedule: ScheduleProvider
    logger: ConversationEventLogger
    startOver: (sessionId: string, newSession: boolean) => Promise<ConversationFlowResult>
}

export interface ReturnFlow {
    offerReturnMenu(sessionId: string, phoneHash: string): Promise<ConversationFlowResult | null>
    handleReturnChoice(
        session: ActiveSession,
        phoneHash: string,
        text: string | undefined,
        optionId: string | undefined,
    ): Promise<ConversationFlowResult>
    handleCancelConfirmation(
        session: ActiveSession,
        phoneHash: string,
        text: string | undefined,
        optionId: string | undefined,
    ): Promise<ConversationFlowResult>
    handleRescheduleSlot(
        session: ActiveSession,
        phoneHash: string,
        text: string | undefined,
        optionId: string | undefined,
    ): Promise<ConversationFlowResult>
}

function replyOf(
    sessionId: string,
    step: ConversationFlowResult["reply"]["step"],
    text: string,
    messages: OutgoingMessage[],
    newSession = false,
): ConversationFlowResult {
    return { sessionId, newSession, reply: { text, step, messages } }
}

function prefixed(result: ConversationFlowResult, prefix: string): ConversationFlowResult {
    return replyOf(
        result.sessionId,
        result.reply.step,
        `${prefix}\n${result.reply.text}`,
        [{ type: "text", text: prefix }, ...(result.reply.messages ?? [])],
        result.newSession,
    )
}

function slotList(sessionId: string, slots: AvailableSlot[], page: number): ConversationFlowResult {
    return replyOf(sessionId, "AWAITING_SLOT", formatarListaSlots(slots, page), criarMensagensSlots(slots, page))
}

function returnMenu(sessionId: string, newSession: boolean, appointmentDatetime: Date): ConversationFlowResult {
    const quando = formatarQuando(appointmentDatetime)
    return replyOf(
        sessionId,
        "AWAITING_RETURN_CHOICE",
        MENU_RETORNO(quando),
        [{ type: "buttons", text: TEXTO_BOTOES_RETORNO(quando), footer: RODAPE_RETORNO, buttons: criarBotoesRetorno() }],
        newSession,
    )
}

type ReturnChoice = "reschedule" | "cancel" | "other"

const RETURN_CHOICE_BY_OPTION = new Map<string, ReturnChoice>([
    ["return_reschedule", "reschedule"],
    ["return_cancel", "cancel"],
    ["return_other", "other"],
])

const RETURN_CHOICE_BY_TEXT = new Map<string, ReturnChoice>([
    ["1", "reschedule"],
    ["2", "cancel"],
    ["3", "other"],
])

function returnChoiceOf(text: string | undefined, optionId: string | undefined): ReturnChoice | null {
    if (optionId) {
        return RETURN_CHOICE_BY_OPTION.get(optionId) ?? null
    }
    return RETURN_CHOICE_BY_TEXT.get(text?.trim() ?? "") ?? null
}

const CANCEL_YES_TEXTS = new Set(["1", "sim"])
const CANCEL_NO_TEXTS = new Set(["2", "não", "nao"])

function cancelDecisionOf(text: string | undefined, optionId: string | undefined): boolean | null {
    if (optionId === "cancel_yes") return true
    if (optionId === "cancel_no") return false
    const cleaned = text?.trim().toLowerCase() ?? ""
    if (CANCEL_YES_TEXTS.has(cleaned)) return true
    if (CANCEL_NO_TEXTS.has(cleaned)) return false
    return null
}

function changeFailed(sessionId: string, step: ActiveSessionStep): ConversationFlowResult {
    return replyOf(sessionId, step, ERRO_FALHA_ALTERACAO, [{ type: "text", text: ERRO_FALHA_ALTERACAO }])
}

function targetIdOf(session: ActiveSession): number | null {
    const raw = session.draft?.target_appointment_id
    const id = typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : raw
    return typeof id === "number" && Number.isSafeInteger(id) && id > 0 ? id : null
}

export function createReturnFlow({ sessions, events, schedule, logger, startOver }: ReturnFlowDependencies): ReturnFlow {
    async function offerReturnMenu(sessionId: string, phoneHash: string): Promise<ConversationFlowResult | null> {
        let returning: ReturningAppointment | null
        try {
            returning = await schedule.findReturningAppointment(phoneHash)
        } catch (err: unknown) {
            logger.error(
                "Failed to read returning appointment",
                conversationEventFailureLog(sessionId, { type: "APPOINTMENT_CONSULTED" }, err),
            )
            return null
        }
        if (!returning) {
            return null
        }

        const appointmentId = Number(returning.id)
        await events.record(sessionId, { type: "APPOINTMENT_CONSULTED", appointmentId })
        await sessions.updateNavigationState(sessionId, {
            currentStep: "AWAITING_RETURN_CHOICE",
            currentCategoryId: null,
            currentQuestionId: null,
            listPage: 1,
            draft: { target_appointment_id: appointmentId },
        })
        return returnMenu(sessionId, true, returning.appointmentDatetime)
    }

    async function currentTarget(session: ActiveSession, phoneHash: string): Promise<ReturningAppointment | null> {
        const targetId = targetIdOf(session)
        if (targetId === null) {
            return null
        }
        const returning = await schedule.findReturningAppointment(phoneHash)
        return returning && Number(returning.id) === targetId ? returning : null
    }

    async function notChangeable(sessionId: string): Promise<ConversationFlowResult> {
        return prefixed(await startOver(sessionId, false), AGENDAMENTO_NAO_ALTERAVEL)
    }

    async function rescheduleSlots(returning: ReturningAppointment): Promise<AvailableSlot[]> {
        const slots = await schedule.getAvailableSlots()
        return slots.filter((slot) => slot.datetime.getTime() !== returning.appointmentDatetime.getTime())
    }

    async function noRescheduleSlot(
        session: ActiveSession,
        returning: ReturningAppointment,
    ): Promise<ConversationFlowResult> {
        await sessions.updateNavigationState(session.id, {
            currentStep: "AWAITING_RETURN_CHOICE",
            currentCategoryId: null,
            currentQuestionId: null,
            listPage: 1,
        })
        return prefixed(
            returnMenu(session.id, false, returning.appointmentDatetime),
            SEM_HORARIOS_REMARCACAO(formatarQuando(returning.appointmentDatetime)),
        )
    }

    async function offerRescheduleSlots(session: ActiveSession, phoneHash: string): Promise<ConversationFlowResult> {
        const returning = await currentTarget(session, phoneHash)
        if (!returning) {
            return notChangeable(session.id)
        }
        const slots = await rescheduleSlots(returning)
        if (slots.length === 0) {
            return noRescheduleSlot(session, returning)
        }
        return showRescheduleSlots(session, slots, 1)
    }

    async function askCancelConfirmation(
        session: ActiveSession,
        returning: ReturningAppointment,
    ): Promise<ConversationFlowResult> {
        await sessions.updateNavigationState(session.id, {
            currentStep: "AWAITING_CANCEL_CONFIRMATION",
            currentCategoryId: null,
            currentQuestionId: null,
        })
        const texto = CONFIRMA_CANCELAMENTO(formatarQuando(returning.appointmentDatetime))
        return replyOf(session.id, "AWAITING_CANCEL_CONFIRMATION", texto, [
            { type: "buttons", text: texto, buttons: criarBotoesConfirmaCancelamento() },
        ])
    }

    async function handleReturnChoice(
        session: ActiveSession,
        phoneHash: string,
        text: string | undefined,
        optionId: string | undefined,
    ): Promise<ConversationFlowResult> {
        const choice = returnChoiceOf(text, optionId)

        if (choice === "other") {
            return startOver(session.id, false)
        }

        if (choice === "reschedule") {
            return offerRescheduleSlots(session, phoneHash)
        }

        if (choice === "cancel") {
            const returning = await currentTarget(session, phoneHash)
            return returning ? askCancelConfirmation(session, returning) : notChangeable(session.id)
        }

        return replyOf(session.id, "AWAITING_RETURN_CHOICE", ERRO_MENU_RETORNO, [
            { type: "buttons", text: ERRO_MENU_RETORNO, buttons: criarBotoesRetorno() },
        ])
    }

    async function backToReturnMenu(session: ActiveSession, phoneHash: string): Promise<ConversationFlowResult> {
        const returning = await currentTarget(session, phoneHash)
        if (!returning) {
            return notChangeable(session.id)
        }
        await sessions.updateNavigationState(session.id, {
            currentStep: "AWAITING_RETURN_CHOICE",
            currentCategoryId: null,
            currentQuestionId: null,
        })
        return returnMenu(session.id, false, returning.appointmentDatetime)
    }

    async function confirmCancel(session: ActiveSession, phoneHash: string): Promise<ConversationFlowResult> {
        const returning = await currentTarget(session, phoneHash)
        if (!returning) {
            return notChangeable(session.id)
        }
        const appointmentId = Number(returning.id)
        let canceled: CitizenCancelResult
        try {
            canceled = await schedule.cancelByCitizen({ sessionId: session.id, appointmentId, phoneHash })
        } catch (err: unknown) {
            if (err instanceof AppointmentNotChangeableError) {
                return notChangeable(session.id)
            }
            logger.error(
                "Failed to change appointment",
                conversationEventFailureLog(session.id, { type: "APPOINTMENT_CANCELED", appointmentId }, err),
            )
            return changeFailed(session.id, "AWAITING_CANCEL_CONFIRMATION")
        }
        const texto = RESPOSTA_CANCELADO(canceled.protocol)
        return replyOf(session.id, "FINISHED", texto, [{ type: "text", text: texto }])
    }

    async function handleCancelConfirmation(
        session: ActiveSession,
        phoneHash: string,
        text: string | undefined,
        optionId: string | undefined,
    ): Promise<ConversationFlowResult> {
        const decision = cancelDecisionOf(text, optionId)

        if (decision === true) {
            return confirmCancel(session, phoneHash)
        }

        if (decision === false) {
            return backToReturnMenu(session, phoneHash)
        }

        return replyOf(session.id, "AWAITING_CANCEL_CONFIRMATION", ERRO_CONFIRMA_CANCELAMENTO, [
            { type: "buttons", text: ERRO_CONFIRMA_CANCELAMENTO, buttons: criarBotoesConfirmaCancelamento() },
        ])
    }

    async function showRescheduleSlots(
        session: ActiveSession,
        slots: AvailableSlot[],
        page: number,
        prefix?: string,
    ): Promise<ConversationFlowResult> {
        await sessions.updateNavigationState(session.id, {
            currentStep: "AWAITING_SLOT",
            currentCategoryId: null,
            currentQuestionId: null,
            listPage: page,
        })
        const listing = slotList(session.id, slots, page)
        return prefix ? prefixed(listing, prefix) : listing
    }

    async function rescheduleTo(
        session: ActiveSession,
        phoneHash: string,
        returning: ReturningAppointment,
        chosenSlot: AvailableSlot,
        slots: AvailableSlot[],
        currentPage: number,
    ): Promise<ConversationFlowResult> {
        const appointmentId = Number(returning.id)
        let result: CitizenRescheduleResult
        try {
            result = await schedule.rescheduleByCitizen({
                sessionId: session.id,
                appointmentId,
                phoneHash,
                appointmentDatetime: chosenSlot.datetime,
            })
        } catch (err: unknown) {
            if (err instanceof SlotFullError) {
                const updatedSlots = await rescheduleSlots(returning)
                return updatedSlots.length === 0
                    ? noRescheduleSlot(session, returning)
                    : showRescheduleSlots(session, updatedSlots, 1, ERRO_SLOT_OCUPADO)
            }
            if (err instanceof DuplicateAppointmentError) {
                return prefixed(slotList(session.id, slots, currentPage), ERRO_DUPLICATE_APPOINTMENT)
            }
            if (err instanceof AppointmentNotChangeableError) {
                return notChangeable(session.id)
            }
            logger.error(
                "Failed to change appointment",
                conversationEventFailureLog(session.id, { type: "APPOINTMENT_RESCHEDULED", appointmentId }, err),
            )
            return changeFailed(session.id, "AWAITING_SLOT")
        }
        const confirmation = formatarConfirmacaoAgendamento({
            titulo: "Agendamento remarcado",
            protocol: result.protocol,
            quando: chosenSlot.formatted,
            unitAddress: result.unitAddress,
            unitAddressComplement: result.unitAddressComplement,
            byRepresentative: result.byRepresentative,
            groupDocuments: result.documentsSent.group,
            questionDocuments: result.documentsSent.question,
            reminderEnabled: result.reminderEnabled,
            reminderHours: result.reminderHours,
        })
        return replyOf(session.id, "FINISHED", confirmation, [{ type: "text", text: confirmation }])
    }

    async function handleRescheduleSlot(
        session: ActiveSession,
        phoneHash: string,
        _text: string | undefined,
        optionId: string | undefined,
    ): Promise<ConversationFlowResult> {
        const returning = await currentTarget(session, phoneHash)
        if (!returning) {
            return notChangeable(session.id)
        }
        const slots = await rescheduleSlots(returning)
        if (slots.length === 0) {
            return noRescheduleSlot(session, returning)
        }
        const paginacao = paginarItens(slots, session.listPage || 1)

        if (optionId?.startsWith("page_")) {
            const targetPage = Number(optionId.replace("page_", ""))
            if (targetPage >= 1 && targetPage <= paginacao.totalPaginas) {
                return showRescheduleSlots(session, slots, targetPage)
            }
        }

        if (optionId?.startsWith("slot_")) {
            const slotIso = optionId.replace("slot_", "")
            const chosenSlot = slots.find((slot) => slot.datetime.toISOString() === slotIso)
            if (chosenSlot) {
                return rescheduleTo(session, phoneHash, returning, chosenSlot, slots, paginacao.paginaAtual)
            }
            return showRescheduleSlots(session, slots, 1, ERRO_SLOT_OCUPADO)
        }

        return replyOf(
            session.id,
            "AWAITING_SLOT",
            formatarErroSlot(slots, paginacao.paginaAtual),
            criarMensagensSlots(slots, paginacao.paginaAtual),
        )
    }

    return { offerReturnMenu, handleReturnChoice, handleCancelConfirmation, handleRescheduleSlot }
}
