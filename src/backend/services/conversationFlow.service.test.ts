import { beforeEach, describe, expect, test, vi } from "vitest"
import { MockConversationEventRepository } from "../repositories/mock/conversationEventMock.repository"
import { ActiveSession, SessionRepository } from "../repositories/session.repository"
import { Categoria, Pergunta, RespostaFinalOutput } from "../types/motorDecisao.types"
import {
    createConversationFlowService,
    MotorDecisao,
    ScheduleProvider,
} from "./conversationFlow.service"
import {
    ConversationEventService,
    createConversationEventService,
} from "./conversationEvent.service"
import {
    ERRO_ATTENDEE,
    ERRO_CPF,
    ERRO_DUPLICATE_APPOINTMENT,
    ERRO_FALHA_AGENDAMENTO,
    ERRO_NOME,
    ERRO_OFERTA_AGENDAMENTO,
    ERRO_RESOLVIDA,
    ERRO_SLOT_OCUPADO,
    ERRO_SLOTS,
    formatarListaPerguntas,
    formatarListaSlots,
    MENSAGEM_RASCUNHO_INCOMPLETO,
    MENSAGEM_SEM_HORARIOS,
    OFERTA_AGENDAMENTO,
    PERGUNTA_RESOLVIDA,
    PROMPT_CPF,
    PROMPT_NOME,
    RESPOSTA_INICIO_AGENDAMENTO,
    RESPOSTA_RECUSA_AGENDAMENTO,
    RESPOSTA_RESOLVIDA_SIM,
    MENSAGEM_ATENDIMENTO_PAUSADO,
} from "./messageFormatter.service"
import { AvailableSlot, BookAppointmentResult } from "../types/schedule.types"
import { SlotFullError } from "../errors/SlotFullError"
import { DuplicateAppointmentError } from "../errors/DuplicateAppointmentError"

const categorias: Categoria[] = [
    { id: 1, title: "Contrato", short_title: "Contrato", active: true },
    { id: 2, title: "Garantias", short_title: "Garantias", active: true },
]

const perguntas: Pergunta[] = [
    {
        id: 10,
        category_id: 1,
        question: "Posso cancelar o contrato?",
        short_title: "Cancelar contrato",
        short_description: "Cancelamento em 7 dias",
        legal_basis: "Art. 49 do CDC",
        answer: "Sim.",
        requires_in_person: false,
        out_of_scope: false,
        active: true,
    },
    {
        id: 11,
        category_id: 1,
        question: "Como denunciar crime cibernético?",
        short_title: "Crime cibernético",
        short_description: "Golpes na internet",
        legal_basis: null,
        answer: "Procure a delegacia.",
        requires_in_person: false,
        out_of_scope: true,
        active: true,
    },
    {
        id: 12,
        category_id: 1,
        question: "Quero abrir processo formal?",
        short_title: "Processo formal",
        short_description: "Abertura presencial de processo",
        legal_basis: null,
        answer: "Compareça ao PROCON.",
        requires_in_person: true,
        out_of_scope: false,
        active: true,
    },
]

const respostaPadrao: RespostaFinalOutput = {
    categoria: "Contrato",
    pergunta: "Posso cancelar o contrato?",
    base_legal: "Art. 49 do CDC",
    resposta: "Sim, você pode cancelar em até 7 dias.",
    documentos_necessarios: ["Nota fiscal"],
    requer_presencial: false,
    fora_de_escopo: false,
}

const respostaForaEscopo: RespostaFinalOutput = {
    categoria: "Contrato",
    pergunta: "Como denunciar crime cibernético?",
    base_legal: "",
    resposta: "Esta dúvida está fora do escopo.",
    documentos_necessarios: [],
    requer_presencial: false,
    fora_de_escopo: true,
}

const respostaPresencial: RespostaFinalOutput = {
    categoria: "Contrato",
    pergunta: "Quero abrir processo formal?",
    base_legal: "",
    resposta: "Esta situação exige atendimento presencial.",
    documentos_necessarios: ["RG", "CPF"],
    requer_presencial: true,
    fora_de_escopo: false,
}

const mockSlots: AvailableSlot[] = [
    {
        datetime: new Date("2026-10-06T08:00:00-03:00"),
        dateStr: "2026-10-06",
        timeStr: "08:00",
        formatted: "Terça-feira, 06/10 às 08:00",
        remainingSeats: 2,
    },
    {
        datetime: new Date("2026-10-06T08:30:00-03:00"),
        dateStr: "2026-10-06",
        timeStr: "08:30",
        formatted: "Terça-feira, 06/10 às 08:30",
        remainingSeats: 1,
    },
]

const mockBookResult: BookAppointmentResult = {
    id: "1",
    appointmentCode: "a3f9c21b-0000-0000-0000-000000000000",
    protocol: "A3F9C21B",
    appointmentDatetime: new Date("2026-10-06T08:00:00-03:00"),
    unitAddress: "Rua do Procon, 100",
    unitAddressComplement: "Centro",
    documentsSent: {
        group: ["RG", "CPF"],
        question: ["Contrato"],
    },
    reminderEnabled: true,
    reminderHours: 24,
}

describe("conversationFlow.service", () => {
    const findOrCreateActive = vi.fn()
    const updateNavigationState = vi.fn()
    const touch = vi.fn()
    const finish = vi.fn()
    const sweepAbandonedSessions = vi.fn()
    const sessions: SessionRepository = {
        findOrCreateActive,
        updateNavigationState,
        touch,
        finish,
        sweepAbandonedSessions,
    }
    const recordEvent = vi.fn()
    const finishEvent = vi.fn()
    const listEvents = vi.fn()
    const events: ConversationEventService = {
        record: recordEvent,
        finish: finishEvent,
        listBySession: listEvents,
    }
    const logger = { error: vi.fn() }

    const iniciarSessao = vi.fn()
    const escolherCategoria = vi.fn()
    const processarPergunta = vi.fn()
    const motor: MotorDecisao = { iniciarSessao, escolherCategoria, processarPergunta }

    const getAvailableSlots = vi.fn()
    const bookSlot = vi.fn()
    const schedule: ScheduleProvider = { getAvailableSlots, bookSlot }

    const hashPhone = (phone: string) => `hash-${phone}`

    const processIncomingMessage = createConversationFlowService({
        sessions,
        events,
        motor,
        schedule,
        hashPhone,
        logger,
        isAutoReplyPaused: async () => false,
    })

    beforeEach(() => {
        vi.clearAllMocks()
    })

    test("sessão nova inicia com saudação, aviso LGPD e lista de categorias", async () => {
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: true,
            currentStep: "AWAITING_CATEGORY",
            currentCategoryId: null,
            listPage: 1,
            draft: null,
        })
        iniciarSessao.mockResolvedValueOnce(categorias)

        const result = await processIncomingMessage({ phone: "5511999999999", text: "Olá" })

        expect(findOrCreateActive).toHaveBeenCalledWith("hash-5511999999999")
        expect(iniciarSessao).toHaveBeenCalledOnce()
        expect(updateNavigationState).toHaveBeenCalledWith("s1", {
            currentStep: "AWAITING_CATEGORY",
            currentCategoryId: null,
            currentQuestionId: null,
            listPage: 1,
            draft: null,
        })
        expect(recordEvent).not.toHaveBeenCalled()
        expect(result.reply.text).toContain("LGPD")
        expect(result.reply.text).toContain("caráter informativo")
        expect(result.reply.step).toBe("AWAITING_CATEGORY")
        expect(result.reply.messages).toBeDefined()
    })

    test("AWAITING_CATEGORY avança para AWAITING_QUESTION ao selecionar categoria válida", async () => {
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_CATEGORY",
            currentCategoryId: null,
            listPage: 1,
            draft: null,
        })
        iniciarSessao.mockResolvedValueOnce(categorias)
        escolherCategoria.mockResolvedValueOnce(perguntas)

        const result = await processIncomingMessage({ phone: "5511999999999", text: "1" })

        expect(escolherCategoria).toHaveBeenCalledWith(categorias[0]?.id)
        expect(updateNavigationState).toHaveBeenCalledWith("s1", {
            currentStep: "AWAITING_QUESTION",
            currentCategoryId: String(categorias[0]?.id),
            listPage: 1,
        })
        expect(recordEvent).toHaveBeenCalledWith("s1", {
            type: "CATEGORY_CHOSEN",
            categoryId: 1,
        })
        expect(result.reply.step).toBe("AWAITING_QUESTION")
        expect(result.reply.text).toEqual(formatarListaPerguntas(perguntas, 1))
    })

    test("AWAITING_CATEGORY com paginação: 'Ver mais opções' avança página", async () => {
        const muitasCategorias: Categoria[] = Array.from({ length: 15 }, (_, i) => ({
            id: i + 1,
            title: `Categoria ${i + 1}`,
            active: true,
        }))

        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_CATEGORY",
            currentCategoryId: null,
            listPage: 1,
            draft: null,
        })
        iniciarSessao.mockResolvedValueOnce(muitasCategorias)

        const result = await processIncomingMessage({ phone: "5511999999999", text: "10" })

        expect(updateNavigationState).toHaveBeenCalledWith("s1", {
            currentStep: "AWAITING_CATEGORY",
            currentCategoryId: null,
            listPage: 2,
        })
        expect(result.reply.step).toBe("AWAITING_CATEGORY")
        expect(result.reply.text).toContain("Categoria 10")
    })

    test("AWAITING_QUESTION: pergunta padrão grava QUESTION_CHOSEN e ANSWER_SENT e avança para AWAITING_RESOLVED", async () => {
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_QUESTION",
            currentCategoryId: "1",
            listPage: 1,
            draft: null,
        })
        escolherCategoria.mockResolvedValueOnce(perguntas)
        processarPergunta.mockResolvedValueOnce(respostaPadrao)

        const result = await processIncomingMessage({ phone: "5511999999999", text: "1" })

        expect(recordEvent).toHaveBeenCalledWith("s1", {
            type: "QUESTION_CHOSEN",
            categoryId: 1,
            questionId: 10,
        })
        expect(recordEvent).toHaveBeenCalledWith("s1", {
            type: "ANSWER_SENT",
            categoryId: 1,
            questionId: 10,
            llm: "NOT_CALLED",
        })
        expect(updateNavigationState).toHaveBeenCalledWith("s1", {
            currentStep: "AWAITING_RESOLVED",
            currentCategoryId: "1",
            currentQuestionId: "10",
        })
        expect(result.reply.step).toBe("AWAITING_RESOLVED")
        expect(result.reply.text).toContain(PERGUNTA_RESOLVIDA)
        expect(result.reply.text).toContain("O que fazer agora")
        expect(finishEvent).not.toHaveBeenCalled()
    })

    test("AWAITING_QUESTION: pergunta fora do escopo encerra com OUT_OF_SCOPE imediatamente", async () => {
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_QUESTION",
            currentCategoryId: "1",
            listPage: 1,
            draft: null,
        })
        escolherCategoria.mockResolvedValueOnce(perguntas)
        processarPergunta.mockResolvedValueOnce(respostaForaEscopo)

        const result = await processIncomingMessage({ phone: "5511999999999", text: "2" })

        expect(recordEvent).toHaveBeenCalledWith("s1", {
            type: "QUESTION_CHOSEN",
            categoryId: 1,
            questionId: 11,
        })
        expect(finishEvent).toHaveBeenCalledWith("s1", {
            outcome: "OUT_OF_SCOPE",
            event: {
                type: "ANSWER_SENT",
                categoryId: 1,
                questionId: 11,
                llm: "NOT_CALLED",
            },
        })
        expect(result.reply.step).toBe("FINISHED")
        expect(result.reply.text).toContain("fora do escopo")
        expect(result.reply.text).not.toContain(PERGUNTA_RESOLVIDA)
        expect(result.reply.text).not.toContain(OFERTA_AGENDAMENTO)
    })

    test("AWAITING_QUESTION: pergunta que requer presencial grava SCHEDULE_OFFERED ('REQUIRES_IN_PERSON') e avança para AWAITING_SCHEDULE_OFFER", async () => {
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_QUESTION",
            currentCategoryId: "1",
            listPage: 1,
            draft: null,
        })
        escolherCategoria.mockResolvedValueOnce(perguntas)
        processarPergunta.mockResolvedValueOnce(respostaPresencial)

        const result = await processIncomingMessage({ phone: "5511999999999", text: "3" })

        expect(recordEvent).toHaveBeenCalledWith("s1", {
            type: "QUESTION_CHOSEN",
            categoryId: 1,
            questionId: 12,
        })
        expect(recordEvent).toHaveBeenCalledWith("s1", {
            type: "ANSWER_SENT",
            categoryId: 1,
            questionId: 12,
            llm: "NOT_CALLED",
        })
        expect(recordEvent).toHaveBeenCalledWith("s1", {
            type: "SCHEDULE_OFFERED",
            reason: "REQUIRES_IN_PERSON",
        })
        expect(updateNavigationState).toHaveBeenCalledWith("s1", {
            currentStep: "AWAITING_SCHEDULE_OFFER",
            currentCategoryId: "1",
            currentQuestionId: "12",
        })
        expect(result.reply.step).toBe("AWAITING_SCHEDULE_OFFER")
        expect(result.reply.text).toContain(OFERTA_AGENDAMENTO)
        expect(result.reply.text).not.toContain(PERGUNTA_RESOLVIDA)
    })

    test("AWAITING_RESOLVED: Sim encerra sessão com RESOLVED", async () => {
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_RESOLVED",
            currentCategoryId: "1",
            listPage: 1,
            draft: null,
        })

        const result = await processIncomingMessage({ phone: "5511999999999", text: "1" })

        expect(finishEvent).toHaveBeenCalledWith("s1", {
            outcome: "RESOLVED",
            event: {
                type: "RESOLVED_ANSWERED",
                resolved: true,
            },
        })
        expect(result.reply.step).toBe("FINISHED")
        expect(result.reply.text).toBe(RESPOSTA_RESOLVIDA_SIM)
    })

    test("AWAITING_RESOLVED: Não grava RESOLVED_ANSWERED (false) + SCHEDULE_OFFERED ('NOT_RESOLVED') e avança para AWAITING_SCHEDULE_OFFER", async () => {
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_RESOLVED",
            currentCategoryId: "1",
            currentQuestionId: "10",
            listPage: 1,
            draft: null,
        })

        const result = await processIncomingMessage({ phone: "5511999999999", text: "2" })

        expect(recordEvent).toHaveBeenCalledWith("s1", {
            type: "RESOLVED_ANSWERED",
            resolved: false,
        })
        expect(recordEvent).toHaveBeenCalledWith("s1", {
            type: "SCHEDULE_OFFERED",
            reason: "NOT_RESOLVED",
        })
        expect(updateNavigationState).toHaveBeenCalledWith("s1", {
            currentStep: "AWAITING_SCHEDULE_OFFER",
            currentCategoryId: null,
            currentQuestionId: "10",
        })
        expect(result.reply.step).toBe("AWAITING_SCHEDULE_OFFER")
        expect(result.reply.text).toBe(OFERTA_AGENDAMENTO)
        expect(finishEvent).not.toHaveBeenCalled()
    })

    test("AWAITING_RESOLVED: entrada inválida re-pergunta se foi resolvida", async () => {
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_RESOLVED",
            currentCategoryId: "1",
            currentQuestionId: "10",
            listPage: 1,
            draft: null,
        })

        const result = await processIncomingMessage({ phone: "5511999999999", text: "invalido" })

        expect(result.reply.step).toBe("AWAITING_RESOLVED")
        expect(result.reply.text).toBe(ERRO_RESOLVIDA)
    })

    test("AWAITING_SCHEDULE_OFFER: Recusar agendamento encerra com DECLINED", async () => {
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_SCHEDULE_OFFER",
            currentCategoryId: "1",
            listPage: 1,
            draft: null,
        })

        const result = await processIncomingMessage({ phone: "5511999999999", text: "2" })

        expect(finishEvent).toHaveBeenCalledWith("s1", {
            outcome: "DECLINED",
            event: {
                type: "SCHEDULE_DECLINED",
            },
        })
        expect(result.reply.step).toBe("FINISHED")
        expect(result.reply.text).toBe(RESPOSTA_RECUSA_AGENDAMENTO)
    })

    test("AWAITING_SCHEDULE_OFFER: Aceitar agendamento avança para AWAITING_ATTENDEE", async () => {
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_SCHEDULE_OFFER",
            currentCategoryId: "1",
            currentQuestionId: "10",
            listPage: 1,
            draft: null,
        })

        const result = await processIncomingMessage({ phone: "5511999999999", text: "1" })

        expect(updateNavigationState).toHaveBeenCalledWith("s1", {
            currentStep: "AWAITING_ATTENDEE",
            currentCategoryId: null,
            currentQuestionId: "10",
        })
        expect(result.reply.step).toBe("AWAITING_ATTENDEE")
        expect(result.reply.text).toBe(RESPOSTA_INICIO_AGENDAMENTO)
    })

    test("AWAITING_SCHEDULE_OFFER: entrada inválida re-pergunta opção de agendamento", async () => {
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_SCHEDULE_OFFER",
            currentCategoryId: "1",
            currentQuestionId: "10",
            listPage: 1,
            draft: null,
        })

        const result = await processIncomingMessage({ phone: "5511999999999", text: "99" })

        expect(result.reply.step).toBe("AWAITING_SCHEDULE_OFFER")
        expect(result.reply.text).toBe(ERRO_OFERTA_AGENDAMENTO)
    })

    describe("Fluxo de Agendamento Presencial (#56)", () => {
        test("AWAITING_ATTENDEE: opção interativa attendee_self grava ATTENDEE_CHOSEN (false) e avança para AWAITING_HOLDER_NAME", async () => {
            findOrCreateActive.mockResolvedValueOnce({
                id: "s1",
                created: false,
                currentStep: "AWAITING_ATTENDEE",
                currentCategoryId: "1",
                currentQuestionId: "10",
                listPage: 1,
                draft: null,
            })

            const result = await processIncomingMessage({ phone: "5511999999999", optionId: "attendee_self" })

            expect(recordEvent).toHaveBeenCalledWith("s1", {
                type: "ATTENDEE_CHOSEN",
                byRepresentative: false,
            })
            expect(updateNavigationState).toHaveBeenCalledWith("s1", {
                currentStep: "AWAITING_HOLDER_NAME",
                currentCategoryId: null,
                currentQuestionId: "10",
                draft: { by_representative: false },
            })
            expect(result.reply.step).toBe("AWAITING_HOLDER_NAME")
            expect(result.reply.text).toBe(PROMPT_NOME)
        })

        test("AWAITING_ATTENDEE: opção interativa attendee_rep grava ATTENDEE_CHOSEN (true) e avança para AWAITING_HOLDER_NAME", async () => {
            findOrCreateActive.mockResolvedValueOnce({
                id: "s1",
                created: false,
                currentStep: "AWAITING_ATTENDEE",
                currentCategoryId: "1",
                currentQuestionId: "10",
                listPage: 1,
                draft: null,
            })

            const result = await processIncomingMessage({ phone: "5511999999999", optionId: "attendee_rep" })

            expect(recordEvent).toHaveBeenCalledWith("s1", {
                type: "ATTENDEE_CHOSEN",
                byRepresentative: true,
            })
            expect(updateNavigationState).toHaveBeenCalledWith("s1", {
                currentStep: "AWAITING_HOLDER_NAME",
                currentCategoryId: null,
                currentQuestionId: "10",
                draft: { by_representative: true },
            })
            expect(result.reply.step).toBe("AWAITING_HOLDER_NAME")
            expect(result.reply.text).toBe(PROMPT_NOME)
        })

        test("AWAITING_ATTENDEE: texto livre é rejeitado e re-solicita escolha com botões", async () => {
            findOrCreateActive.mockResolvedValueOnce({
                id: "s1",
                created: false,
                currentStep: "AWAITING_ATTENDEE",
                currentCategoryId: "1",
                currentQuestionId: "10",
                listPage: 1,
                draft: null,
            })

            const result = await processIncomingMessage({ phone: "5511999999999", text: "1" })

            expect(result.reply.step).toBe("AWAITING_ATTENDEE")
            expect(result.reply.text).toBe(ERRO_ATTENDEE)
            expect(result.reply.messages?.[0]?.type).toBe("buttons")
        })

        test("AWAITING_ATTENDEE: opção inválida re-solicita escolha com botões", async () => {
            findOrCreateActive.mockResolvedValueOnce({
                id: "s1",
                created: false,
                currentStep: "AWAITING_ATTENDEE",
                currentCategoryId: "1",
                currentQuestionId: "10",
                listPage: 1,
                draft: null,
            })

            const result = await processIncomingMessage({ phone: "5511999999999", optionId: "invalido" })

            expect(result.reply.step).toBe("AWAITING_ATTENDEE")
            expect(result.reply.text).toBe(ERRO_ATTENDEE)
            expect(result.reply.messages?.[0]?.type).toBe("buttons")
        })

        test("AWAITING_HOLDER_NAME: nome válido salva draft e avança para AWAITING_HOLDER_CPF preservando currentQuestionId", async () => {
            findOrCreateActive.mockResolvedValueOnce({
                id: "s1",
                created: false,
                currentStep: "AWAITING_HOLDER_NAME",
                currentCategoryId: "1",
                currentQuestionId: "10",
                listPage: 1,
                draft: { by_representative: false },
            })

            const result = await processIncomingMessage({ phone: "5511999999999", text: "Maria da Silva" })

            expect(updateNavigationState).toHaveBeenCalledWith("s1", {
                currentStep: "AWAITING_HOLDER_CPF",
                currentCategoryId: null,
                currentQuestionId: "10",
                draft: {
                    by_representative: false,
                    holder_name: "Maria da Silva",
                },
            })
            expect(result.reply.step).toBe("AWAITING_HOLDER_CPF")
            expect(result.reply.text).toBe(PROMPT_CPF)
        })

        test("AWAITING_HOLDER_NAME: nome inválido (vazio ou 1 caractere) re-solicita nome", async () => {
            findOrCreateActive.mockResolvedValueOnce({
                id: "s1",
                created: false,
                currentStep: "AWAITING_HOLDER_NAME",
                currentCategoryId: "1",
                currentQuestionId: "10",
                listPage: 1,
                draft: { by_representative: false },
            })

            const result = await processIncomingMessage({ phone: "5511999999999", text: "A" })

            expect(result.reply.step).toBe("AWAITING_HOLDER_NAME")
            expect(result.reply.text).toBe(ERRO_NOME)
        })

        test("AWAITING_HOLDER_NAME: nome com dígitos é recusado para proteger CPF", async () => {
            findOrCreateActive.mockResolvedValueOnce({
                id: "s1",
                created: false,
                currentStep: "AWAITING_HOLDER_NAME",
                currentCategoryId: "1",
                currentQuestionId: "10",
                listPage: 1,
                draft: { by_representative: false },
            })

            const result = await processIncomingMessage({ phone: "5511999999999", text: "Maria 529.982.247-25" })

            expect(result.reply.step).toBe("AWAITING_HOLDER_NAME")
            expect(result.reply.text).toBe(ERRO_NOME)
            expect(updateNavigationState).not.toHaveBeenCalled()
        })

        test("AWAITING_HOLDER_CPF: CPF inválido re-solicita CPF", async () => {
            findOrCreateActive.mockResolvedValueOnce({
                id: "s1",
                created: false,
                currentStep: "AWAITING_HOLDER_CPF",
                currentCategoryId: "1",
                currentQuestionId: "10",
                listPage: 1,
                draft: { by_representative: false, holder_name: "Maria da Silva" },
            })

            const result = await processIncomingMessage({ phone: "5511999999999", text: "123.456.789-00" })

            expect(result.reply.step).toBe("AWAITING_HOLDER_CPF")
            expect(result.reply.text).toBe(ERRO_CPF)
        })

        test("AWAITING_HOLDER_CPF: CPF válido com horários avança para AWAITING_SLOT sem gravar PHONE_NOTICE_SHOWN antes da reserva", async () => {
            findOrCreateActive.mockResolvedValueOnce({
                id: "s1",
                created: false,
                currentStep: "AWAITING_HOLDER_CPF",
                currentCategoryId: "1",
                currentQuestionId: "10",
                listPage: 1,
                draft: { by_representative: false, holder_name: "Maria da Silva" },
            })
            getAvailableSlots.mockResolvedValueOnce(mockSlots)

            const result = await processIncomingMessage({ phone: "5511999999999", text: "529.982.247-25" })

            expect(recordEvent).not.toHaveBeenCalledWith("s1", {
                type: "PHONE_NOTICE_SHOWN",
            })
            expect(updateNavigationState).toHaveBeenCalledWith("s1", expect.objectContaining({
                currentStep: "AWAITING_SLOT",
                currentCategoryId: null,
                currentQuestionId: "10",
                listPage: 1,
                draft: expect.objectContaining({
                    holder_name: "Maria da Silva",
                    cpf_masked: "***.982.247-**",
                }),
            }))
            expect(result.reply.step).toBe("AWAITING_SLOT")
            expect(result.reply.text).toEqual(formatarListaSlots(mockSlots, 1))
            expect(result.reply.messages).toBeDefined()
        })

        test("AWAITING_HOLDER_CPF: CPF válido mas sem horários disponíveis encerra com NO_SLOT", async () => {
            findOrCreateActive.mockResolvedValueOnce({
                id: "s1",
                created: false,
                currentStep: "AWAITING_HOLDER_CPF",
                currentCategoryId: "1",
                currentQuestionId: "10",
                listPage: 1,
                draft: { by_representative: false, holder_name: "Maria da Silva" },
            })
            getAvailableSlots.mockResolvedValueOnce([])

            const result = await processIncomingMessage({ phone: "5511999999999", text: "52998224725" })

            expect(finishEvent).toHaveBeenCalledWith("s1", {
                outcome: "NO_SLOT",
                event: { type: "NO_SLOT" },
            })
            expect(result.reply.step).toBe("FINISHED")
            expect(result.reply.text).toBe(MENSAGEM_SEM_HORARIOS)
        })

        test("AWAITING_SLOT: escolhe slot válido por optionId realiza agendamento e retorna confirmação", async () => {
            findOrCreateActive.mockResolvedValueOnce({
                id: "s1",
                created: false,
                currentStep: "AWAITING_SLOT",
                currentCategoryId: "1",
                currentQuestionId: "10",
                listPage: 1,
                draft: {
                    by_representative: false,
                    holder_name: "Maria da Silva",
                    cpf_hash: "a".repeat(64),
                    cpf_masked: "***.982.247-**",
                },
            })
            getAvailableSlots.mockResolvedValueOnce(mockSlots)
            processarPergunta.mockResolvedValueOnce(respostaPadrao)
            bookSlot.mockResolvedValueOnce(mockBookResult)

            const result = await processIncomingMessage({
                phone: "5511999999999",
                optionId: `slot_${mockSlots[0]?.datetime.toISOString()}`,
            })

            expect(bookSlot).toHaveBeenCalledWith(expect.objectContaining({
                sessionId: "s1",
                questionId: 10,
                name: "Maria da Silva",
                cpfHash: "a".repeat(64),
                cpfMasked: "***.982.247-**",
                phone: "5511999999999",
                byRepresentative: false,
                appointmentDatetime: mockSlots[0]?.datetime,
            }))

            expect(result.reply.step).toBe("FINISHED")
            expect(result.reply.text).toContain("Agendamento realizado")
            expect(result.reply.text).toContain("Protocolo: A3F9C21B")
            expect(result.reply.text).toContain("Data e hora: Terça-feira, 06/10 às 08:00")
            expect(result.reply.text).toContain("Leve ao atendimento:")
        })

        test("AWAITING_SLOT: texto livre é rejeitado e re-solicita seleção pela lista", async () => {
            findOrCreateActive.mockResolvedValueOnce({
                id: "s1",
                created: false,
                currentStep: "AWAITING_SLOT",
                currentCategoryId: "1",
                currentQuestionId: "10",
                listPage: 1,
                draft: {
                    by_representative: false,
                    holder_name: "Maria da Silva",
                    cpf_hash: "a".repeat(64),
                    cpf_masked: "***.982.247-**",
                },
            })
            getAvailableSlots.mockResolvedValueOnce(mockSlots)

            const result = await processIncomingMessage({
                phone: "5511999999999",
                text: "1",
            })

            expect(bookSlot).not.toHaveBeenCalled()
            expect(result.reply.step).toBe("AWAITING_SLOT")
            expect(result.reply.text).toContain(ERRO_SLOTS)
        })

        test("AWAITING_SLOT: draft incompleto reinicia em AWAITING_ATTENDEE com mensagem amigável", async () => {
            findOrCreateActive.mockResolvedValueOnce({
                id: "s1",
                created: false,
                currentStep: "AWAITING_SLOT",
                currentCategoryId: "1",
                currentQuestionId: "10",
                listPage: 1,
                draft: {
                    by_representative: false,
                    cpf_hash: "a".repeat(64),
                    cpf_masked: "***.982.247-**",
                },
            })
            getAvailableSlots.mockResolvedValueOnce(mockSlots)

            const result = await processIncomingMessage({
                phone: "5511999999999",
                optionId: `slot_${mockSlots[0]?.datetime.toISOString()}`,
            })

            expect(updateNavigationState).toHaveBeenCalledWith("s1", {
                currentStep: "AWAITING_ATTENDEE",
                currentCategoryId: null,
                currentQuestionId: "10",
                draft: null,
            })
            expect(result.reply.step).toBe("AWAITING_ATTENDEE")
            expect(result.reply.text).toBe(MENSAGEM_RASCUNHO_INCOMPLETO)
        })

        test("AWAITING_SLOT: conflito de concorrência (SlotFullError) avisa e recarrega horários na página 1 atualizando estado", async () => {
            findOrCreateActive.mockResolvedValueOnce({
                id: "s1",
                created: false,
                currentStep: "AWAITING_SLOT",
                currentCategoryId: "1",
                currentQuestionId: "10",
                listPage: 2,
                draft: {
                    by_representative: false,
                    holder_name: "Maria da Silva",
                    cpf_hash: "a".repeat(64),
                    cpf_masked: "***.982.247-**",
                },
            })
            getAvailableSlots.mockResolvedValueOnce(mockSlots)
            processarPergunta.mockResolvedValueOnce(respostaPadrao)
            bookSlot.mockRejectedValueOnce(new SlotFullError())
            const remainingSlot = [mockSlots[1]!]
            getAvailableSlots.mockResolvedValueOnce(remainingSlot)

            const result = await processIncomingMessage({
                phone: "5511999999999",
                optionId: `slot_${mockSlots[0]?.datetime.toISOString()}`,
            })

            expect(updateNavigationState).toHaveBeenCalledWith("s1", {
                currentStep: "AWAITING_SLOT",
                currentCategoryId: null,
                currentQuestionId: "10",
                listPage: 1,
            })
            expect(result.reply.step).toBe("AWAITING_SLOT")
            expect(result.reply.text).toContain(ERRO_SLOT_OCUPADO)
            expect(result.reply.text).toContain("1. Terça-feira, 06/10 às 08:30")
        })

        test("AWAITING_SLOT: conflito de horário duplicado (DuplicateAppointmentError) avisa cidadão", async () => {
            findOrCreateActive.mockResolvedValueOnce({
                id: "s1",
                created: false,
                currentStep: "AWAITING_SLOT",
                currentCategoryId: "1",
                currentQuestionId: "10",
                listPage: 1,
                draft: {
                    by_representative: false,
                    holder_name: "Maria da Silva",
                    cpf_hash: "a".repeat(64),
                    cpf_masked: "***.982.247-**",
                },
            })
            getAvailableSlots.mockResolvedValueOnce(mockSlots)
            processarPergunta.mockResolvedValueOnce(respostaPadrao)
            bookSlot.mockRejectedValueOnce(new DuplicateAppointmentError())

            const result = await processIncomingMessage({
                phone: "5511999999999",
                optionId: `slot_${mockSlots[0]?.datetime.toISOString()}`,
            })

            expect(result.reply.step).toBe("AWAITING_SLOT")
            expect(result.reply.text).toContain(ERRO_DUPLICATE_APPOINTMENT)
        })

        test("AWAITING_SLOT: falha inesperada na reserva avisa o cidadão que o agendamento não foi gravado", async () => {
            findOrCreateActive.mockResolvedValueOnce({
                id: "s1",
                created: false,
                currentStep: "AWAITING_SLOT",
                currentCategoryId: "1",
                currentQuestionId: "10",
                listPage: 1,
                draft: {
                    by_representative: false,
                    holder_name: "Maria da Silva",
                    cpf_hash: "a".repeat(64),
                    cpf_masked: "***.982.247-**",
                },
            })
            getAvailableSlots.mockResolvedValueOnce(mockSlots)
            processarPergunta.mockResolvedValueOnce(respostaPadrao)
            bookSlot.mockRejectedValueOnce(new Error("Database connection lost"))

            const result = await processIncomingMessage({
                phone: "5511999999999",
                optionId: `slot_${mockSlots[0]?.datetime.toISOString()}`,
            })

            expect(result.reply.step).toBe("AWAITING_SLOT")
            expect(result.reply.text).toBe(ERRO_FALHA_AGENDAMENTO)
            expect(logger.error).toHaveBeenCalledWith("Failed to book appointment", expect.any(Object))
        })

        test("fluxo completo mantendo estado: oi -> categoria -> pergunta -> agendar -> eu mesmo -> nome -> CPF -> horário -> agendamento concluído", async () => {
            let sessionDb: ActiveSession | null = null

            const statefulSessions: SessionRepository = {
                findOrCreateActive: vi.fn(async (_phoneHash: string) => {
                    if (!sessionDb) {
                        sessionDb = {
                            id: "sess_full_1",
                            created: true,
                            currentStep: "AWAITING_CATEGORY",
                            currentCategoryId: null,
                            currentQuestionId: null,
                            listPage: 1,
                            draft: null,
                        }
                        return sessionDb
                    }
                    return { ...sessionDb, created: false }
                }),
                updateNavigationState: vi.fn(async (_sessionId: string, input: Parameters<SessionRepository["updateNavigationState"]>[1]) => {
                    sessionDb = {
                        ...sessionDb!,
                        currentStep: input.currentStep,
                        currentCategoryId: input.currentCategoryId !== undefined ? input.currentCategoryId : sessionDb!.currentCategoryId,
                        currentQuestionId: input.currentQuestionId !== undefined ? input.currentQuestionId : sessionDb!.currentQuestionId,
                        listPage: input.listPage !== undefined ? input.listPage : sessionDb!.listPage,
                        draft: input.draft !== undefined ? input.draft : sessionDb!.draft,
                    }
                }),
                touch: vi.fn(async () => {}),
                finish: vi.fn(async () => {}),
                sweepAbandonedSessions: vi.fn(async () => 0),
            }

            const statefulFlow = createConversationFlowService({
                sessions: statefulSessions,
                events,
                motor,
                schedule,
                hashPhone,
                logger,
                isAutoReplyPaused: async () => false,
            })

            iniciarSessao.mockResolvedValue(categorias)
            escolherCategoria.mockResolvedValue(perguntas)
            processarPergunta.mockResolvedValue(respostaPadrao)
            getAvailableSlots.mockResolvedValue(mockSlots)
            bookSlot.mockResolvedValue(mockBookResult)

            const citizenPhone = "5512991112233"

            const r1 = await statefulFlow({ phone: citizenPhone, text: "oi" })
            expect(r1.reply.step).toBe("AWAITING_CATEGORY")

            const r2 = await statefulFlow({ phone: citizenPhone, text: "1" })
            expect(r2.reply.step).toBe("AWAITING_QUESTION")
            expect(sessionDb.currentCategoryId).toBe("1")

            const r3 = await statefulFlow({ phone: citizenPhone, text: "1" })
            expect(r3.reply.step).toBe("AWAITING_RESOLVED")
            expect(sessionDb.currentQuestionId).toBe("10")

            const r4 = await statefulFlow({ phone: citizenPhone, text: "2" })
            expect(r4.reply.step).toBe("AWAITING_SCHEDULE_OFFER")
            expect(sessionDb.currentQuestionId).toBe("10")

            const r5 = await statefulFlow({ phone: citizenPhone, text: "1" })
            expect(r5.reply.step).toBe("AWAITING_ATTENDEE")
            expect(sessionDb.currentQuestionId).toBe("10")

            const r6 = await statefulFlow({ phone: citizenPhone, optionId: "attendee_self" })
            expect(r6.reply.step).toBe("AWAITING_HOLDER_NAME")
            expect(sessionDb.currentQuestionId).toBe("10")
            expect(sessionDb.draft?.by_representative).toBe(false)

            const r7 = await statefulFlow({ phone: citizenPhone, text: "Maria da Silva" })
            expect(r7.reply.step).toBe("AWAITING_HOLDER_CPF")
            expect(sessionDb.currentQuestionId).toBe("10")
            expect(sessionDb.draft?.holder_name).toBe("Maria da Silva")

            const r8 = await statefulFlow({ phone: citizenPhone, text: "529.982.247-25" })
            expect(r8.reply.step).toBe("AWAITING_SLOT")
            expect(sessionDb.currentQuestionId).toBe("10")
            expect(sessionDb.draft?.cpf_masked).toBe("***.982.247-**")

            const chosenIso = mockSlots[0]!.datetime.toISOString()
            const r9 = await statefulFlow({ phone: citizenPhone, optionId: `slot_${chosenIso}` })
            expect(r9.reply.step).toBe("FINISHED")
            expect(r9.reply.text).toContain("Agendamento realizado")
            expect(bookSlot).toHaveBeenCalledWith(expect.objectContaining({
                sessionId: "sess_full_1",
                questionId: 10,
                name: "Maria da Silva",
                byRepresentative: false,
                phone: citizenPhone,
            }))
        })
    })

    test("suporta cliques interativos via optionId nos botões", async () => {
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_RESOLVED",
            currentCategoryId: "1",
            listPage: 1,
        })

        const result = await processIncomingMessage({ phone: "5511999999999", optionId: "resolved_yes" })

        expect(finishEvent).toHaveBeenCalledWith("s1", {
            outcome: "RESOLVED",
            event: {
                type: "RESOLVED_ANSWERED",
                resolved: true,
            },
        })
        expect(result.reply.step).toBe("FINISHED")
    })

    test("falha ao gravar evento comum com record não impede a resposta ao cidadão", async () => {
        const repository = new MockConversationEventRepository()
        repository.failWith(Object.assign(new Error("db down"), { code: "57P01" }))
        const realEvents = createConversationEventService({
            events: repository,
            sessions: { finish: vi.fn() },
            logger,
        })
        const flow = createConversationFlowService({
            sessions,
            events: realEvents,
            motor,
            schedule,
            hashPhone,
            logger,
            isAutoReplyPaused: async () => false,
        })
        findOrCreateActive.mockResolvedValueOnce({
            id: "7",
            created: false,
            currentStep: "AWAITING_CATEGORY",
            currentCategoryId: null,
            listPage: 1,
        })
        iniciarSessao.mockResolvedValueOnce(categorias)
        escolherCategoria.mockResolvedValueOnce(perguntas)

        const result = await flow({ phone: "5500000000101", text: "1" })

        expect(result.reply.step).toBe("AWAITING_QUESTION")
        expect(logger.error).toHaveBeenCalledWith(expect.any(String), {
            type: "CATEGORY_CHOSEN",
            sessionId: "7",
            code: "57P01",
        })
    })

    test("falha no encerramento entrega a resposta final e registra o log sem dados do cidadão", async () => {
        const citizenText = "1 Meu nome é Maria Fictícia e meu CPF é 000.000.000-00"
        findOrCreateActive.mockResolvedValueOnce({
            id: "7",
            created: false,
            currentStep: "AWAITING_QUESTION",
            currentCategoryId: "1",
            listPage: 1,
        })
        escolherCategoria.mockResolvedValueOnce(perguntas)
        processarPergunta.mockResolvedValueOnce(respostaForaEscopo)
        finishEvent.mockRejectedValueOnce(Object.assign(new Error(citizenText), { code: "23514" }))

        const result = await processIncomingMessage({ phone: "5500000000101", text: " 2 " })

        expect(result.reply.step).toBe("FINISHED")
        expect(logger.error).toHaveBeenCalledOnce()
        expect(logger.error).toHaveBeenCalledWith(expect.any(String), {
            type: "ANSWER_SENT",
            sessionId: "7",
            code: "23514",
        })
        expect(JSON.stringify(logger.error.mock.calls)).not.toContain("Maria")
        expect(JSON.stringify(logger.error.mock.calls)).not.toContain("5500000000101")
    })
})

describe("conversationFlow.service com o atendimento automatico pausado (#83)", () => {
    const findOrCreateActive = vi.fn()
    const updateNavigationState = vi.fn()
    const touch = vi.fn()
    const finish = vi.fn()
    const sweepAbandonedSessions = vi.fn()
    const sessions: SessionRepository = { findOrCreateActive, updateNavigationState, touch, finish, sweepAbandonedSessions }
    const recordEvent = vi.fn()
    const finishEvent = vi.fn()
    const listEvents = vi.fn()
    const events: ConversationEventService = { record: recordEvent, finish: finishEvent, listBySession: listEvents }
    const iniciarSessao = vi.fn()
    const escolherCategoria = vi.fn()
    const processarPergunta = vi.fn()
    const motor: MotorDecisao = { iniciarSessao, escolherCategoria, processarPergunta }
    const hashPhone = vi.fn((phone: string) => `hash-${phone}`)
    const isAutoReplyPaused = vi.fn<() => Promise<boolean>>()
    const flow = createConversationFlowService({
        sessions,
        events,
        motor,
        hashPhone,
        logger: { error: vi.fn() },
        isAutoReplyPaused,
    })

    const pausedReply = {
        sessionId: null,
        newSession: false,
        paused: true,
        reply: {
            text: MENSAGEM_ATENDIMENTO_PAUSADO,
            step: null,
            messages: [{ type: "text", text: MENSAGEM_ATENDIMENTO_PAUSADO }],
        },
    }

    function expectSessionUntouched() {
        expect(findOrCreateActive).not.toHaveBeenCalled()
        expect(touch).not.toHaveBeenCalled()
        expect(updateNavigationState).not.toHaveBeenCalled()
        expect(finish).not.toHaveBeenCalled()
        expect(recordEvent).not.toHaveBeenCalled()
        expect(finishEvent).not.toHaveBeenCalled()
        expect(iniciarSessao).not.toHaveBeenCalled()
        expect(escolherCategoria).not.toHaveBeenCalled()
        expect(processarPergunta).not.toHaveBeenCalled()
        expect(hashPhone).not.toHaveBeenCalled()
    }

    beforeEach(() => {
        vi.clearAllMocks()
    })

    test("responde o texto fixo da pausa sem tocar na sessao, em eventos, no motor nem no hash do telefone", async () => {
        isAutoReplyPaused.mockResolvedValue(true)

        const result = await flow({ phone: "5500000000001", text: "Olá" })

        expect(result).toEqual(pausedReply)
        expectSessionUntouched()
    })

    test("responde o mesmo texto fixo para a escolha de uma opcao durante a pausa", async () => {
        isAutoReplyPaused.mockResolvedValue(true)

        const result = await flow({ phone: "5500000000001", optionId: "cat_1" })

        expect(result).toEqual(pausedReply)
        expectSessionUntouched()
    })

    test("consulta a pausa a cada mensagem, sem guardar o estado anterior", async () => {
        isAutoReplyPaused.mockResolvedValueOnce(true).mockResolvedValueOnce(false)
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: true,
            currentStep: "AWAITING_CATEGORY",
            currentCategoryId: null,
            listPage: 1,
        })
        iniciarSessao.mockResolvedValueOnce(categorias)

        const paused = await flow({ phone: "5500000000001", text: "Olá" })
        const resumed = await flow({ phone: "5500000000001", text: "Olá" })

        expect(paused).toEqual(pausedReply)
        expect(resumed).not.toHaveProperty("paused")
        expect(resumed.reply.step).toBe("AWAITING_CATEGORY")
        expect(isAutoReplyPaused).toHaveBeenCalledTimes(2)
        expect(findOrCreateActive).toHaveBeenCalledTimes(1)
    })

    test("depois de retomar, a sessao em andamento continua no passo em que estava", async () => {
        isAutoReplyPaused.mockResolvedValueOnce(true).mockResolvedValueOnce(true).mockResolvedValueOnce(false)
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_QUESTION",
            currentCategoryId: "1",
            listPage: 1,
        })
        escolherCategoria.mockResolvedValueOnce(perguntas)
        processarPergunta.mockResolvedValueOnce(respostaPadrao)

        await flow({ phone: "5500000000001", text: "1" })
        await flow({ phone: "5500000000001", text: "1" })
        const result = await flow({ phone: "5500000000001", text: "1" })

        expect(findOrCreateActive).toHaveBeenCalledTimes(1)
        expect(touch).toHaveBeenCalledWith("s1")
        expect(escolherCategoria).toHaveBeenCalledWith(1)
        expect(processarPergunta).toHaveBeenCalledWith(10)
        expect(result.sessionId).toBe("s1")
        expect(result.reply.step).toBe("AWAITING_RESOLVED")
    })
})
