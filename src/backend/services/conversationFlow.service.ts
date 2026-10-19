import { hashPhone } from "./whatsappSession.service"
import {
    ActiveSession,
    sessionRepository,
    SessionRepository,
} from "../repositories/session.repository"
import { MotorDecisaoService } from "./motorDecisao.service"
import { PgMotorDecisaoRepository } from "../repositories/motorDecisao.repository"
import {
    Categoria,
    Pergunta,
} from "../types/motorDecisao.types"
import {
    criarBotoesAttendee,
    criarBotoesOfertaAgendamento,
    criarBotoesResolvida,
    criarMensagensCategorias,
    criarMensagensPerguntas,
    ERRO_OFERTA_AGENDAMENTO,
    ERRO_RESOLVIDA,
    formatarCategoriaSemPerguntas,
    formatarErroCategoria,
    formatarErroPergunta,
    formatarListaCategorias,
    formatarListaPerguntas,
    formatarRespostaFinal,
    MENSAGEM_ATENDIMENTO_PAUSADO,
    OFERTA_AGENDAMENTO,
    paginarItens,
    PERGUNTA_RESOLVIDA,
    RESPOSTA_INICIO_AGENDAMENTO,
    RESPOSTA_RECUSA_AGENDAMENTO,
    RESPOSTA_RESOLVIDA_SIM,
} from "./messageFormatter.service"
import { createScheduleService } from "./schedule.service"
import { scheduleRepository } from "../repositories/schedule.repository"
import {
    ConversationEventLogger,
    conversationEventService,
    ConversationEventService,
} from "./conversationEvent.service"
import type { SessionClosing } from "../types/conversationEvent.types"
import { whatsappSettingsService } from "./whatsappSettings.service"
import type {
    ConversationFlowInput,
    ConversationFlowResponse,
    ConversationFlowResult,
    MotorDecisao,
    PausedConversationFlowResult,
    ScheduleProvider,
} from "../types/conversationFlow.types"
import { createSessionCloser } from "./conversationClosing.service"
import { createSchedulingFlow } from "./schedulingFlow.service"

export type {
    ConversationFlowInput,
    ConversationFlowReply,
    ConversationFlowResponse,
    ConversationFlowResult,
    MotorDecisao,
    PausedConversationFlowResult,
    ScheduleProvider,
} from "../types/conversationFlow.types"

interface ConversationFlowDependencies {
    sessions: SessionRepository
    events: ConversationEventService
    motor: MotorDecisao
    schedule: ScheduleProvider
    hashPhone: (phone: string) => string
    logger: ConversationEventLogger
    isAutoReplyPaused: () => Promise<boolean>
}

function pausedReply(): PausedConversationFlowResult {
    return {
        sessionId: null,
        newSession: false,
        paused: true,
        reply: {
            text: MENSAGEM_ATENDIMENTO_PAUSADO,
            step: null,
            messages: [{ type: "text", text: MENSAGEM_ATENDIMENTO_PAUSADO }],
        },
    }
}

function parseOption(text: string | undefined): number | null {
    if (!text) {
        return null
    }

    const trimmed = text.trim()

    if (!/^\d+$/.test(trimmed)) {
        return null
    }

    const value = Number(trimmed)
    return value > 0 ? value : null
}

function parseYesNo(
    text: string | undefined,
    optionId: string | undefined,
    yesId: string,
    noId: string,
): boolean | null {
    if (optionId === yesId) return true
    if (optionId === noId) return false

    if (!text) return null
    const cleaned = text.trim().toLowerCase()

    if (cleaned === "1" || cleaned === "sim" || cleaned === "s" || cleaned.includes("agendar")) {
        return true
    }
    if (cleaned === "2" || cleaned === "não" || cleaned === "nao" || cleaned === "n" || cleaned.includes("agora não") || cleaned.includes("agora nao")) {
        return false
    }

    return null
}

function createPhoneLock() {
    const locks = new Map<string, Promise<void>>()

    return async function withPhoneLock<T>(
        phone: string,
        callback: () => Promise<T>,
    ): Promise<T> {
        const previous = locks.get(phone) ?? Promise.resolve()

        let release!: () => void

        const current = new Promise<void>((resolve) => {
            release = resolve
        })

        locks.set(phone, current)

        await previous

        try {
            return await callback()
        } finally {
            release()

            if (locks.get(phone) === current) {
                locks.delete(phone)
            }
        }
    }
}

export function createConversationFlowService({
    sessions,
    events,
    motor,
    schedule,
    hashPhone: hashPhoneOf,
    logger,
    isAutoReplyPaused,
}: ConversationFlowDependencies): (
    input: ConversationFlowInput,
) => Promise<ConversationFlowResponse> {
    const withPhoneLock = createPhoneLock()
    const closer = createSessionCloser({ events, logger })
    const scheduling = createSchedulingFlow({
        sessions,
        events,
        motor,
        schedule,
        logger,
        closer,
    })

    async function startOver(
        sessionId: string,
        newSession: boolean,
    ): Promise<ConversationFlowResult> {
        const categorias = await motor.iniciarSessao()

        await sessions.updateNavigationState(sessionId, {
            currentStep: "AWAITING_CATEGORY",
            currentCategoryId: null,
            currentQuestionId: null,
            listPage: 1,
            draft: null,
        })

        return {
            sessionId,
            newSession,
            reply: {
                text: formatarListaCategorias(categorias, 1),
                step: "AWAITING_CATEGORY",
                messages: criarMensagensCategorias(categorias, 1),
            },
        }
    }

    async function handleAwaitingCategory(
        sessionId: string,
        currentPage: number,
        text: string | undefined,
        optionId: string | undefined,
    ): Promise<ConversationFlowResult> {
        const categorias = await motor.iniciarSessao()
        const paginacao = paginarItens(categorias, currentPage)

        // 1. Tratar navegação por clique em optionId
        if (optionId) {
            if (optionId.startsWith("page_")) {
                const targetPage = Number(optionId.replace("page_", ""))
                if (targetPage >= 1 && targetPage <= paginacao.totalPaginas) {
                    await sessions.updateNavigationState(sessionId, {
                        currentStep: "AWAITING_CATEGORY",
                        currentCategoryId: null,
                        listPage: targetPage,
                    })
                    return {
                        sessionId,
                        newSession: false,
                        reply: {
                            text: formatarListaCategorias(categorias, targetPage),
                            step: "AWAITING_CATEGORY",
                            messages: criarMensagensCategorias(categorias, targetPage),
                        },
                    }
                }
            }

            if (optionId.startsWith("cat_")) {
                const catId = Number(optionId.replace("cat_", ""))
                const categoria = categorias.find((c) => Number(c.id) === catId)
                if (categoria) {
                    return transitionToQuestions(sessionId, categoria)
                }
            }
        }

        // 2. Tratar navegação por texto/número
        const escolha = parseOption(text)

        if (escolha !== null) {
            // Se clicou em "Voltar"
            if (paginacao.opcaoAnterior !== undefined && escolha === paginacao.opcaoAnterior) {
                const targetPage = paginacao.paginaAtual - 1
                await sessions.updateNavigationState(sessionId, {
                    currentStep: "AWAITING_CATEGORY",
                    currentCategoryId: null,
                    listPage: targetPage,
                })
                return {
                    sessionId,
                    newSession: false,
                    reply: {
                        text: formatarListaCategorias(categorias, targetPage),
                        step: "AWAITING_CATEGORY",
                        messages: criarMensagensCategorias(categorias, targetPage),
                    },
                }
            }

            // Se clicou em "Ver mais opções"
            if (paginacao.opcaoProxima !== undefined && escolha === paginacao.opcaoProxima) {
                const targetPage = paginacao.paginaAtual + 1
                await sessions.updateNavigationState(sessionId, {
                    currentStep: "AWAITING_CATEGORY",
                    currentCategoryId: null,
                    listPage: targetPage,
                })
                return {
                    sessionId,
                    newSession: false,
                    reply: {
                        text: formatarListaCategorias(categorias, targetPage),
                        step: "AWAITING_CATEGORY",
                        messages: criarMensagensCategorias(categorias, targetPage),
                    },
                }
            }

            // Se escolheu um item da página
            if (escolha >= 1 && escolha <= paginacao.itensPagina.length) {
                const categoria = paginacao.itensPagina[escolha - 1]
                if (categoria) {
                    return transitionToQuestions(sessionId, categoria)
                }
            }
        }

        return {
            sessionId,
            newSession: false,
            reply: {
                text: formatarErroCategoria(categorias, paginacao.paginaAtual),
                step: "AWAITING_CATEGORY",
                messages: criarMensagensCategorias(categorias, paginacao.paginaAtual),
            },
        }
    }

    async function transitionToQuestions(
        sessionId: string,
        categoria: Categoria,
    ): Promise<ConversationFlowResult> {
        const perguntas = await motor.escolherCategoria(Number(categoria.id))

        if (perguntas.length === 0) {
            return {
                sessionId,
                newSession: false,
                reply: {
                    text: formatarCategoriaSemPerguntas(),
                    step: "AWAITING_CATEGORY",
                },
            }
        }

        await sessions.updateNavigationState(sessionId, {
            currentStep: "AWAITING_QUESTION",
            currentCategoryId: String(categoria.id),
            listPage: 1,
        })

        await events.record(sessionId, {
            type: "CATEGORY_CHOSEN",
            categoryId: Number(categoria.id),
        })

        return {
            sessionId,
            newSession: false,
            reply: {
                text: formatarListaPerguntas(perguntas, 1),
                step: "AWAITING_QUESTION",
                messages: criarMensagensPerguntas(perguntas, 1),
            },
        }
    }

    async function handleAwaitingQuestion(
        sessionId: string,
        currentCategoryId: string | null,
        currentPage: number,
        text: string | undefined,
        optionId: string | undefined,
    ): Promise<ConversationFlowResult> {
        if (!currentCategoryId) {
            return startOver(sessionId, false)
        }

        const perguntas = await motor.escolherCategoria(Number(currentCategoryId))
        const paginacao = paginarItens(perguntas, currentPage)

        // 1. Tratar navegação por optionId
        if (optionId) {
            if (optionId.startsWith("page_")) {
                const targetPage = Number(optionId.replace("page_", ""))
                if (targetPage >= 1 && targetPage <= paginacao.totalPaginas) {
                    await sessions.updateNavigationState(sessionId, {
                        currentStep: "AWAITING_QUESTION",
                        currentCategoryId,
                        listPage: targetPage,
                    })
                    return {
                        sessionId,
                        newSession: false,
                        reply: {
                            text: formatarListaPerguntas(perguntas, targetPage),
                            step: "AWAITING_QUESTION",
                            messages: criarMensagensPerguntas(perguntas, targetPage),
                        },
                    }
                }
            }

            if (optionId.startsWith("q_")) {
                const qId = Number(optionId.replace("q_", ""))
                const pergunta = perguntas.find((p) => Number(p.id) === qId)
                if (pergunta) {
                    return processSelectedQuestion(sessionId, pergunta)
                }
            }
        }

        // 2. Tratar navegação por texto/número
        const escolha = parseOption(text)

        if (escolha !== null) {
            if (paginacao.opcaoAnterior !== undefined && escolha === paginacao.opcaoAnterior) {
                const targetPage = paginacao.paginaAtual - 1
                await sessions.updateNavigationState(sessionId, {
                    currentStep: "AWAITING_QUESTION",
                    currentCategoryId,
                    listPage: targetPage,
                })
                return {
                    sessionId,
                    newSession: false,
                    reply: {
                        text: formatarListaPerguntas(perguntas, targetPage),
                        step: "AWAITING_QUESTION",
                        messages: criarMensagensPerguntas(perguntas, targetPage),
                    },
                }
            }

            if (paginacao.opcaoProxima !== undefined && escolha === paginacao.opcaoProxima) {
                const targetPage = paginacao.paginaAtual + 1
                await sessions.updateNavigationState(sessionId, {
                    currentStep: "AWAITING_QUESTION",
                    currentCategoryId,
                    listPage: targetPage,
                })
                return {
                    sessionId,
                    newSession: false,
                    reply: {
                        text: formatarListaPerguntas(perguntas, targetPage),
                        step: "AWAITING_QUESTION",
                        messages: criarMensagensPerguntas(perguntas, targetPage),
                    },
                }
            }

            if (escolha >= 1 && escolha <= paginacao.itensPagina.length) {
                const pergunta = paginacao.itensPagina[escolha - 1]
                if (pergunta) {
                    return processSelectedQuestion(sessionId, pergunta)
                }
            }
        }

        return {
            sessionId,
            newSession: false,
            reply: {
                text: formatarErroPergunta(perguntas, paginacao.paginaAtual),
                step: "AWAITING_QUESTION",
                messages: criarMensagensPerguntas(perguntas, paginacao.paginaAtual),
            },
        }
    }

    async function processSelectedQuestion(
        sessionId: string,
        pergunta: Pergunta,
    ): Promise<ConversationFlowResult> {
        await events.record(sessionId, {
            type: "QUESTION_CHOSEN",
            categoryId: Number(pergunta.category_id),
            questionId: Number(pergunta.id),
        })

        const resposta = await motor.processarPergunta(pergunta.id)

        // Caso 1: Fora do escopo do PROCON (Decisão 008 - encerra direto com OUT_OF_SCOPE)
        if (resposta.fora_de_escopo) {
            const closing: SessionClosing = {
                outcome: "OUT_OF_SCOPE",
                event: {
                    type: "ANSWER_SENT",
                    categoryId: Number(pergunta.category_id),
                    questionId: Number(pergunta.id),
                    llm: "NOT_CALLED",
                },
            }
            await closer.finishOrLog(sessionId, closing)

            return {
                sessionId,
                newSession: false,
                reply: {
                    text: formatarRespostaFinal(resposta),
                    step: "FINISHED",
                    messages: [{ type: "text", text: formatarRespostaFinal(resposta) }],
                },
            }
        }

        // Grava ANSWER_SENT para casos dentro do escopo
        await events.record(sessionId, {
            type: "ANSWER_SENT",
            categoryId: Number(pergunta.category_id),
            questionId: Number(pergunta.id),
            llm: "NOT_CALLED",
        })

        // Caso 2: Exige atendimento presencial (oferece agendamento direto)
        if (resposta.requer_presencial) {
            await events.record(sessionId, {
                type: "SCHEDULE_OFFERED",
                reason: "REQUIRES_IN_PERSON",
            })

            await sessions.updateNavigationState(sessionId, {
                currentStep: "AWAITING_SCHEDULE_OFFER",
                currentCategoryId: String(pergunta.category_id),
                currentQuestionId: String(pergunta.id),
            })

            return {
                sessionId,
                newSession: false,
                reply: {
                    text: `${formatarRespostaFinal(resposta)}\n\n${OFERTA_AGENDAMENTO}`,
                    step: "AWAITING_SCHEDULE_OFFER",
                    messages: [
                        { type: "text", text: formatarRespostaFinal(resposta) },
                        {
                            type: "buttons",
                            text: "Deseja agendar um atendimento presencial no PROCON Jacareí?",
                            buttons: criarBotoesOfertaAgendamento(),
                        },
                    ],
                },
            }
        }

        // Caso 3: Pergunta padrão -> Pergunta se a dúvida foi resolvida
        await sessions.updateNavigationState(sessionId, {
            currentStep: "AWAITING_RESOLVED",
            currentCategoryId: String(pergunta.category_id),
            currentQuestionId: String(pergunta.id),
        })

        return {
            sessionId,
            newSession: false,
            reply: {
                text: `${formatarRespostaFinal(resposta)}\n\n${PERGUNTA_RESOLVIDA}`,
                step: "AWAITING_RESOLVED",
                messages: [
                    { type: "text", text: formatarRespostaFinal(resposta) },
                    {
                        type: "buttons",
                        text: "A dúvida foi resolvida?",
                        buttons: criarBotoesResolvida(),
                    },
                ],
            },
        }
    }

    async function handleAwaitingResolved(
        session: ActiveSession,
        text: string | undefined,
        optionId: string | undefined,
    ): Promise<ConversationFlowResult> {
        const resolvida = parseYesNo(text, optionId, "resolved_yes", "resolved_no")

        if (resolvida === true) {
            const closing: SessionClosing = {
                outcome: "RESOLVED",
                event: {
                    type: "RESOLVED_ANSWERED",
                    resolved: true,
                },
            }
            await closer.finishOrLog(session.id, closing)

            return {
                sessionId: session.id,
                newSession: false,
                reply: {
                    text: RESPOSTA_RESOLVIDA_SIM,
                    step: "FINISHED",
                    messages: [{ type: "text", text: RESPOSTA_RESOLVIDA_SIM }],
                },
            }
        }

        if (resolvida === false) {
            await events.record(session.id, {
                type: "RESOLVED_ANSWERED",
                resolved: false,
            })

            await events.record(session.id, {
                type: "SCHEDULE_OFFERED",
                reason: "NOT_RESOLVED",
            })

            await sessions.updateNavigationState(session.id, {
                currentStep: "AWAITING_SCHEDULE_OFFER",
                currentCategoryId: null,
                currentQuestionId: session.currentQuestionId ?? null,
            })

            return {
                sessionId: session.id,
                newSession: false,
                reply: {
                    text: OFERTA_AGENDAMENTO,
                    step: "AWAITING_SCHEDULE_OFFER",
                    messages: [
                        {
                            type: "buttons",
                            text: "Deseja agendar um atendimento presencial no PROCON Jacareí?",
                            buttons: criarBotoesOfertaAgendamento(),
                        },
                    ],
                },
            }
        }

        return {
            sessionId: session.id,
            newSession: false,
            reply: {
                text: ERRO_RESOLVIDA,
                step: "AWAITING_RESOLVED",
                messages: [
                    {
                        type: "buttons",
                        text: ERRO_RESOLVIDA,
                        buttons: criarBotoesResolvida(),
                    },
                ],
            },
        }
    }

    async function handleAwaitingScheduleOffer(
        session: ActiveSession,
        text: string | undefined,
        optionId: string | undefined,
    ): Promise<ConversationFlowResult> {
        const querAgendar = parseYesNo(text, optionId, "schedule_yes", "schedule_no")

        if (querAgendar === false) {
            const closing: SessionClosing = {
                outcome: "DECLINED",
                event: {
                    type: "SCHEDULE_DECLINED",
                },
            }
            await closer.finishOrLog(session.id, closing)

            return {
                sessionId: session.id,
                newSession: false,
                reply: {
                    text: RESPOSTA_RECUSA_AGENDAMENTO,
                    step: "FINISHED",
                    messages: [{ type: "text", text: RESPOSTA_RECUSA_AGENDAMENTO }],
                },
            }
        }

        if (querAgendar === true) {
            await sessions.updateNavigationState(session.id, {
                currentStep: "AWAITING_ATTENDEE",
                currentCategoryId: null,
                currentQuestionId: session.currentQuestionId ?? null,
            })

            return {
                sessionId: session.id,
                newSession: false,
                reply: {
                    text: RESPOSTA_INICIO_AGENDAMENTO,
                    step: "AWAITING_ATTENDEE",
                    messages: [
                        {
                            type: "buttons",
                            text: "Vamos iniciar o agendamento presencial. Quem irá comparecer ao atendimento?",
                            buttons: criarBotoesAttendee(),
                        },
                    ],
                },
            }
        }

        return {
            sessionId: session.id,
            newSession: false,
            reply: {
                text: ERRO_OFERTA_AGENDAMENTO,
                step: "AWAITING_SCHEDULE_OFFER",
                messages: [
                    {
                        type: "buttons",
                        text: ERRO_OFERTA_AGENDAMENTO,
                        buttons: criarBotoesOfertaAgendamento(),
                    },
                ],
            },
        }
    }

    async function processMessage({
        phone,
        text,
        optionId,
    }: ConversationFlowInput): Promise<ConversationFlowResponse> {
        if (await isAutoReplyPaused()) {
            return pausedReply()
        }

        const session = await sessions.findOrCreateActive(hashPhoneOf(phone))

        if (session.created) {
            return startOver(session.id, session.created)
        }

        await sessions.touch(session.id)

        const page = session.listPage || 1

        if (session.currentStep === "AWAITING_CATEGORY") {
            return handleAwaitingCategory(session.id, page, text, optionId)
        }

        if (session.currentStep === "AWAITING_QUESTION") {
            return handleAwaitingQuestion(
                session.id,
                session.currentCategoryId,
                page,
                text,
                optionId,
            )
        }

        if (session.currentStep === "AWAITING_RESOLVED") {
            return handleAwaitingResolved(session, text, optionId)
        }

        if (session.currentStep === "AWAITING_SCHEDULE_OFFER") {
            return handleAwaitingScheduleOffer(session, text, optionId)
        }

        if (session.currentStep === "AWAITING_ATTENDEE") {
            return scheduling.handleAwaitingAttendee(session, text, optionId)
        }

        if (session.currentStep === "AWAITING_HOLDER_NAME") {
            return scheduling.handleAwaitingHolderName(session, text)
        }

        if (session.currentStep === "AWAITING_HOLDER_CPF") {
            return scheduling.handleAwaitingHolderCpf(session, text)
        }

        if (session.currentStep === "AWAITING_SLOT") {
            return scheduling.handleAwaitingSlot(session, phone, text, optionId)
        }

        // Se estiver em outro step futuro ou inesperado, recomeça
        return startOver(session.id, false)
    }

    return async (input: ConversationFlowInput): Promise<ConversationFlowResponse> => {
        const phone = input.phone.trim()

        if (!phone) {
            throw new Error("Phone is required")
        }

        return withPhoneLock(phone, () => processMessage(input))
    }
}

export const processIncomingMessage = createConversationFlowService({
    sessions: sessionRepository,
    events: conversationEventService,
    motor: new MotorDecisaoService(new PgMotorDecisaoRepository()),
    schedule: createScheduleService(scheduleRepository),
    hashPhone,
    logger: console,
    isAutoReplyPaused: () => whatsappSettingsService.isAutoReplyPaused(),
})

export async function sweepAbandonedSessions(): Promise<number> {
    return sessionRepository.sweepAbandonedSessions()
}
