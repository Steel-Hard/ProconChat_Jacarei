import { beforeEach, describe, expect, test, vi } from "vitest"
import { MockConversationEventRepository } from "../repositories/mock/conversationEventMock.repository"
import { SessionRepository } from "../repositories/session.repository"
import { Categoria, Pergunta, RespostaFinalOutput } from "../types/motorDecisao.types"
import { createConversationFlowService, MotorDecisao } from "./conversationFlow.service"
import { ConversationEventService, createConversationEventService } from "./conversationEvent.service"
import {
    ERRO_OFERTA_AGENDAMENTO,
    ERRO_RESOLVIDA,
    formatarListaPerguntas,
    OFERTA_AGENDAMENTO,
    PERGUNTA_RESOLVIDA,
    RESPOSTA_INICIO_AGENDAMENTO,
    RESPOSTA_RECUSA_AGENDAMENTO,
    RESPOSTA_RESOLVIDA_SIM,
} from "./messageFormatter.service"

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

describe("conversationFlow.service (Issue #55 - Novo fluxo da dúvida)", () => {
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

    const hashPhone = (phone: string) => `hash-${phone}`

    const processIncomingMessage = createConversationFlowService({
        sessions,
        events,
        motor,
        hashPhone,
        logger,
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
        expect(result.reply.text).not.toContain(PERGUNTA_RESOLVIDA)
        expect(result.reply.text).not.toContain(OFERTA_AGENDAMENTO)
    })

    test("AWAITING_QUESTION: pergunta presencial pula 'resolveu?' e oferece agendamento direto", async () => {
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_QUESTION",
            currentCategoryId: "1",
            listPage: 1,
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

    test("AWAITING_RESOLVED: Sim (1) finaliza a sessão com RESOLVED e grava RESOLVED_ANSWERED (true)", async () => {
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_RESOLVED",
            currentCategoryId: "1",
            listPage: 1,
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

    test("AWAITING_RESOLVED: Não (2) avança para AWAITING_SCHEDULE_OFFER e grava eventos", async () => {
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_RESOLVED",
            currentCategoryId: "1",
            listPage: 1,
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
            listPage: 1,
        })

        const result = await processIncomingMessage({ phone: "5511999999999", text: "invalido" })

        expect(result.reply.step).toBe("AWAITING_RESOLVED")
        expect(result.reply.text).toBe(ERRO_RESOLVIDA)
    })

    test("AWAITING_SCHEDULE_OFFER: Agora não (2) finaliza com DECLINED e grava SCHEDULE_DECLINED", async () => {
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_SCHEDULE_OFFER",
            currentCategoryId: "1",
            listPage: 1,
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

    test("AWAITING_SCHEDULE_OFFER: Agendar (1) avança para AWAITING_ATTENDEE", async () => {
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_SCHEDULE_OFFER",
            currentCategoryId: "1",
            listPage: 1,
        })

        const result = await processIncomingMessage({ phone: "5511999999999", text: "1" })

        expect(updateNavigationState).toHaveBeenCalledWith("s1", {
            currentStep: "AWAITING_ATTENDEE",
            currentCategoryId: null,
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
            listPage: 1,
        })

        const result = await processIncomingMessage({ phone: "5511999999999", text: "99" })

        expect(result.reply.step).toBe("AWAITING_SCHEDULE_OFFER")
        expect(result.reply.text).toBe(ERRO_OFERTA_AGENDAMENTO)
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
        const flow = createConversationFlowService({ sessions, events: realEvents, motor, hashPhone, logger })
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
