import {
    ActiveSession,
    NavigationState,
    SessionDraft,
    SessionRepository,
} from "../repositories/session.repository"
import {
    criarBotoesAttendee,
    criarMensagensSlots,
    ERRO_ATTENDEE,
    ERRO_CPF,
    ERRO_DUPLICATE_APPOINTMENT,
    ERRO_FALHA_AGENDAMENTO,
    ERRO_NOME,
    ERRO_SLOT_OCUPADO,
    formatarConfirmacaoAgendamento,
    formatarErroSlot,
    formatarListaSlots,
    MENSAGEM_RASCUNHO_INCOMPLETO,
    MENSAGEM_SEM_HORARIOS,
    paginarItens,
    PROMPT_CPF,
    PROMPT_NOME,
} from "./messageFormatter.service"
import { cleanCpf, hashCpf, maskCpf, validateCpf } from "../utils/cpf.utils"
import { AvailableSlot } from "../types/schedule.types"
import {
    conversationEventFailureLog,
    ConversationEventLogger,
    ConversationEventService,
} from "./conversationEvent.service"
import type { SessionClosing } from "../types/conversationEvent.types"
import type {
    ConversationFlowResult,
    MotorDecisao,
    ScheduleProvider,
} from "../types/conversationFlow.types"
import type { SessionCloser } from "./conversationClosing.service"
import SlotFullError from "../errors/SlotFullError"
import DuplicateAppointmentError from "../errors/DuplicateAppointmentError"

interface SchedulingFlowDependencies {
    sessions: SessionRepository
    events: ConversationEventService
    motor: MotorDecisao
    schedule: ScheduleProvider
    logger: ConversationEventLogger
    closer: SessionCloser
}

export interface SchedulingFlow {
    handleAwaitingAttendee(
        session: ActiveSession,
        text: string | undefined,
        optionId: string | undefined,
    ): Promise<ConversationFlowResult>
    handleAwaitingHolderName(session: ActiveSession, text: string | undefined): Promise<ConversationFlowResult>
    handleAwaitingHolderCpf(session: ActiveSession, text: string | undefined): Promise<ConversationFlowResult>
    handleAwaitingSlot(
        session: ActiveSession,
        phone: string,
        text: string | undefined,
        optionId: string | undefined,
    ): Promise<ConversationFlowResult>
}

const HOLDER_NAME_PATTERN = /^[\p{L}\p{M} '’.,-]+$/u
const HOLDER_NAME_LETTER = /\p{L}/u

function keepQuestion(session: ActiveSession): Pick<NavigationState, "currentCategoryId" | "currentQuestionId"> {
    return {
        currentCategoryId: null,
        currentQuestionId: session.currentQuestionId ?? null,
    }
}

export function createSchedulingFlow({
    sessions,
    events,
    motor,
    schedule,
    logger,
    closer,
}: SchedulingFlowDependencies): SchedulingFlow {
    async function noSlotReply(sessionId: string): Promise<ConversationFlowResult> {
        const closing: SessionClosing = {
            outcome: "NO_SLOT",
            event: {
                type: "NO_SLOT",
            },
        }
        await closer.finishOrLog(sessionId, closing)

        return {
            sessionId,
            newSession: false,
            reply: {
                text: MENSAGEM_SEM_HORARIOS,
                step: "FINISHED",
                messages: [{ type: "text", text: MENSAGEM_SEM_HORARIOS }],
            },
        }
    }

    async function handleAwaitingAttendee(
        session: ActiveSession,
        _text: string | undefined,
        optionId: string | undefined,
    ): Promise<ConversationFlowResult> {
        let byRepresentative: boolean | null = null

        if (optionId === "attendee_self") {
            byRepresentative = false
        } else if (optionId === "attendee_rep") {
            byRepresentative = true
        }

        if (byRepresentative === null) {
            return {
                sessionId: session.id,
                newSession: false,
                reply: {
                    text: ERRO_ATTENDEE,
                    step: "AWAITING_ATTENDEE",
                    messages: [
                        {
                            type: "buttons",
                            text: ERRO_ATTENDEE,
                            buttons: criarBotoesAttendee(),
                        },
                    ],
                },
            }
        }

        await events.record(session.id, {
            type: "ATTENDEE_CHOSEN",
            byRepresentative,
        })

        await sessions.updateNavigationState(session.id, {
            currentStep: "AWAITING_HOLDER_NAME",
            ...keepQuestion(session),
            draft: {
                ...session.draft,
                by_representative: byRepresentative,
            },
        })

        return {
            sessionId: session.id,
            newSession: false,
            reply: {
                text: PROMPT_NOME,
                step: "AWAITING_HOLDER_NAME",
                messages: [{ type: "text", text: PROMPT_NOME }],
            },
        }
    }

    async function handleAwaitingHolderName(
        session: ActiveSession,
        text: string | undefined,
    ): Promise<ConversationFlowResult> {
        const name = text?.trim().normalize("NFC")

        if (
            !name ||
            name.length < 2 ||
            name.length > 150 ||
            !HOLDER_NAME_PATTERN.test(name) ||
            !HOLDER_NAME_LETTER.test(name)
        ) {
            return {
                sessionId: session.id,
                newSession: false,
                reply: {
                    text: ERRO_NOME,
                    step: "AWAITING_HOLDER_NAME",
                    messages: [{ type: "text", text: ERRO_NOME }],
                },
            }
        }

        await sessions.updateNavigationState(session.id, {
            currentStep: "AWAITING_HOLDER_CPF",
            ...keepQuestion(session),
            draft: {
                ...session.draft,
                holder_name: name,
            },
        })

        return {
            sessionId: session.id,
            newSession: false,
            reply: {
                text: PROMPT_CPF,
                step: "AWAITING_HOLDER_CPF",
                messages: [{ type: "text", text: PROMPT_CPF }],
            },
        }
    }

    async function handleAwaitingHolderCpf(
        session: ActiveSession,
        text: string | undefined,
    ): Promise<ConversationFlowResult> {
        if (!validateCpf(text)) {
            return {
                sessionId: session.id,
                newSession: false,
                reply: {
                    text: ERRO_CPF,
                    step: "AWAITING_HOLDER_CPF",
                    messages: [{ type: "text", text: ERRO_CPF }],
                },
            }
        }

        const cleaned = cleanCpf(text!)
        const cpfHash = hashCpf(cleaned)
        const cpfMasked = maskCpf(cleaned)

        const updatedDraft: SessionDraft = {
            ...session.draft,
            cpf_hash: cpfHash,
            cpf_masked: cpfMasked,
        }

        const slots = await schedule.getAvailableSlots()

        if (slots.length === 0) {
            return noSlotReply(session.id)
        }

        await sessions.updateNavigationState(session.id, {
            currentStep: "AWAITING_SLOT",
            ...keepQuestion(session),
            listPage: 1,
            draft: updatedDraft,
        })

        return {
            sessionId: session.id,
            newSession: false,
            reply: {
                text: formatarListaSlots(slots, 1),
                step: "AWAITING_SLOT",
                messages: criarMensagensSlots(slots, 1),
            },
        }
    }

    async function bookChosenSlot(
        session: ActiveSession,
        phone: string,
        chosenSlot: AvailableSlot,
        slots: AvailableSlot[],
        currentPage: number,
    ): Promise<ConversationFlowResult> {
        const questionId = Number(session.currentQuestionId)
        const hasValidQuestion = Number.isSafeInteger(questionId) && questionId > 0
        const hasValidDraft =
            Boolean(session.draft?.holder_name) &&
            Boolean(session.draft?.cpf_hash) &&
            Boolean(session.draft?.cpf_masked) &&
            session.draft?.by_representative !== undefined

        if (!hasValidQuestion || !hasValidDraft) {
            await sessions.updateNavigationState(session.id, {
                currentStep: "AWAITING_ATTENDEE",
                ...keepQuestion(session),
                draft: null,
            })

            return {
                sessionId: session.id,
                newSession: false,
                reply: {
                    text: MENSAGEM_RASCUNHO_INCOMPLETO,
                    step: "AWAITING_ATTENDEE",
                    messages: [
                        {
                            type: "buttons",
                            text: MENSAGEM_RASCUNHO_INCOMPLETO,
                            buttons: criarBotoesAttendee(),
                        },
                    ],
                },
            }
        }

        const perguntaResp = await motor.processarPergunta(questionId)
        const reason = perguntaResp.requer_presencial
            ? "REQUIRES_IN_PERSON"
            : "NOT_RESOLVED"

        try {
            const bookResult = await schedule.bookSlot({
                sessionId: session.id,
                questionId,
                reason,
                name: session.draft!.holder_name!,
                cpfHash: session.draft!.cpf_hash!,
                cpfMasked: session.draft!.cpf_masked!,
                phone,
                byRepresentative: session.draft!.by_representative!,
                appointmentDatetime: chosenSlot.datetime,
            })

            const confirmationText = formatarConfirmacaoAgendamento({
                protocol: bookResult.protocol,
                quando: chosenSlot.formatted,
                unitAddress: bookResult.unitAddress,
                unitAddressComplement: bookResult.unitAddressComplement,
                byRepresentative: session.draft!.by_representative!,
                groupDocuments: bookResult.documentsSent.group,
                questionDocuments: bookResult.documentsSent.question,
                reminderEnabled: bookResult.reminderEnabled,
                reminderHours: bookResult.reminderHours,
            })

            return {
                sessionId: session.id,
                newSession: false,
                reply: {
                    text: confirmationText,
                    step: "FINISHED",
                    messages: [{ type: "text", text: confirmationText }],
                },
            }
        } catch (err: unknown) {
            if (err instanceof SlotFullError) {
                const updatedSlots = await schedule.getAvailableSlots()
                if (updatedSlots.length === 0) {
                    return noSlotReply(session.id)
                }

                await sessions.updateNavigationState(session.id, {
                    currentStep: "AWAITING_SLOT",
                    ...keepQuestion(session),
                    listPage: 1,
                })

                return {
                    sessionId: session.id,
                    newSession: false,
                    reply: {
                        text: `${ERRO_SLOT_OCUPADO}\n${formatarListaSlots(updatedSlots, 1)}`,
                        step: "AWAITING_SLOT",
                        messages: [
                            { type: "text", text: ERRO_SLOT_OCUPADO },
                            ...criarMensagensSlots(updatedSlots, 1),
                        ],
                    },
                }
            }

            if (err instanceof DuplicateAppointmentError) {
                return {
                    sessionId: session.id,
                    newSession: false,
                    reply: {
                        text: `${ERRO_DUPLICATE_APPOINTMENT}\n${formatarListaSlots(slots, currentPage)}`,
                        step: "AWAITING_SLOT",
                        messages: [
                            { type: "text", text: ERRO_DUPLICATE_APPOINTMENT },
                            ...criarMensagensSlots(slots, currentPage),
                        ],
                    },
                }
            }

            logger.error(
                "Failed to book appointment",
                conversationEventFailureLog(session.id, { type: "APPOINTMENT_CREATED" }, err),
            )

            return {
                sessionId: session.id,
                newSession: false,
                reply: {
                    text: ERRO_FALHA_AGENDAMENTO,
                    step: "AWAITING_SLOT",
                    messages: [{ type: "text", text: ERRO_FALHA_AGENDAMENTO }],
                },
            }
        }
    }

    async function handleAwaitingSlot(
        session: ActiveSession,
        phone: string,
        _text: string | undefined,
        optionId: string | undefined,
    ): Promise<ConversationFlowResult> {
        const slots = await schedule.getAvailableSlots()

        if (slots.length === 0) {
            return noSlotReply(session.id)
        }

        const currentPage = session.listPage || 1
        const paginacao = paginarItens(slots, currentPage)

        if (optionId) {
            if (optionId.startsWith("page_")) {
                const targetPage = Number(optionId.replace("page_", ""))
                if (targetPage >= 1 && targetPage <= paginacao.totalPaginas) {
                    await sessions.updateNavigationState(session.id, {
                        currentStep: "AWAITING_SLOT",
                        ...keepQuestion(session),
                        listPage: targetPage,
                    })
                    return {
                        sessionId: session.id,
                        newSession: false,
                        reply: {
                            text: formatarListaSlots(slots, targetPage),
                            step: "AWAITING_SLOT",
                            messages: criarMensagensSlots(slots, targetPage),
                        },
                    }
                }
            }

            if (optionId.startsWith("slot_")) {
                const slotIso = optionId.replace("slot_", "")
                const chosenSlot = slots.find((s) => s.datetime.toISOString() === slotIso)
                if (chosenSlot) {
                    return bookChosenSlot(session, phone, chosenSlot, slots, currentPage)
                }

                await sessions.updateNavigationState(session.id, {
                    currentStep: "AWAITING_SLOT",
                    ...keepQuestion(session),
                    listPage: 1,
                })
                return {
                    sessionId: session.id,
                    newSession: false,
                    reply: {
                        text: `${ERRO_SLOT_OCUPADO}\n${formatarListaSlots(slots, 1)}`,
                        step: "AWAITING_SLOT",
                        messages: [
                            { type: "text", text: ERRO_SLOT_OCUPADO },
                            ...criarMensagensSlots(slots, 1),
                        ],
                    },
                }
            }
        }

        return {
            sessionId: session.id,
            newSession: false,
            reply: {
                text: formatarErroSlot(slots, paginacao.paginaAtual),
                step: "AWAITING_SLOT",
                messages: criarMensagensSlots(slots, paginacao.paginaAtual),
            },
        }
    }

    return {
        handleAwaitingAttendee,
        handleAwaitingHolderName,
        handleAwaitingHolderCpf,
        handleAwaitingSlot,
    }
}
