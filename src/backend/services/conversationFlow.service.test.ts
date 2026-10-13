import { beforeEach, describe, expect, test, vi } from "vitest"
import { MockConversationEventRepository } from "../repositories/conversationEventMock.repository"
import { SessionRepository } from "../repositories/session.repository"
import { Categoria, Pergunta, RespostaFinalOutput } from "../types/motorDecisao.types"
import { createConversationFlowService, MotorDecisao } from "./conversationFlow.service"
import { ConversationEventService, createConversationEventService } from "./conversationEvent.service"
import {
    formatarCategoriaSemPerguntas,
    formatarErroCategoria,
    formatarErroPergunta,
    formatarListaCategorias,
    formatarListaPerguntas,
    formatarRespostaFinal,
} from "./messageFormatter.service"

const categorias: Categoria[] = [
    { id: 1, title: "Contrato", active: true },
    { id: 2, title: "Garantias", active: true },
]

const perguntas: Pergunta[] = [
    {
        id: 10,
        category_id: 1,
        question: "Posso cancelar o contrato?",
        legal_basis: "Art. 49 do CDC",
        answer: "Sim.",
        requires_in_person: false,
        out_of_scope: false,
        active: true,
    },
    {
        id: 11,
        category_id: 1,
        question: "Existe multa por cancelamento?",
        legal_basis: null,
        answer: "Depende do contrato.",
        requires_in_person: false,
        out_of_scope: false,
        active: true,
    },
]

const respostaFinal: RespostaFinalOutput = {
    categoria: "Contrato",
    pergunta: "Posso cancelar o contrato?",
    base_legal: "Art. 49 do CDC",
    resposta: "Sim, você pode cancelar em até 7 dias.",
    documentos_necessarios: ["Nota fiscal"],
    requer_presencial: false,
    fora_de_escopo: false,
}

describe("conversationFlow.service", () => {
    const findOrCreateActive = vi.fn()
    const updateNavigationState = vi.fn()
    const touch = vi.fn()
    const finish = vi.fn()
    const sessions: SessionRepository = { findOrCreateActive, updateNavigationState, touch, finish }
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

    test("sessão nova ignora o texto recebido e devolve a lista de categorias sem gravar STARTED pelo fluxo", async () => {
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: true,
            currentStep: "AWAITING_CATEGORY",
            currentCategoryId: null,
        })
        iniciarSessao.mockResolvedValueOnce(categorias)

        const result = await processIncomingMessage({ phone: "5511999999999", text: "qualquer coisa" })

        expect(findOrCreateActive).toHaveBeenCalledWith("hash-5511999999999")
        expect(iniciarSessao).toHaveBeenCalledOnce()
        expect(recordEvent).not.toHaveBeenCalled()
        expect(result).toEqual({
            sessionId: "s1",
            newSession: true,
            reply: { text: formatarListaCategorias(categorias), step: "AWAITING_CATEGORY" },
        })
    })

    test("AWAITING_CATEGORY com escolha numérica válida avança para AWAITING_QUESTION", async () => {
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_CATEGORY",
            currentCategoryId: null,
        })
        iniciarSessao.mockResolvedValueOnce(categorias)
        escolherCategoria.mockResolvedValueOnce(perguntas)

        const result = await processIncomingMessage({ phone: "5511999999999", text: "2" })

        expect(escolherCategoria).toHaveBeenCalledWith(categorias[1]?.id)
        expect(updateNavigationState).toHaveBeenCalledWith("s1", {
            currentStep: "AWAITING_QUESTION",
            currentCategoryId: String(categorias[1]?.id),
        })
        expect(recordEvent).toHaveBeenCalledWith("s1", {
            type: "CATEGORY_CHOSEN",
            categoryId: categorias[1]?.id,
        })
        expect(result).toEqual({
            sessionId: "s1",
            newSession: false,
            reply: { text: formatarListaPerguntas(perguntas), step: "AWAITING_QUESTION" },
        })
    })

    test("AWAITING_CATEGORY com categoria sem perguntas ativas mantém o passo atual", async () => {
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_CATEGORY",
            currentCategoryId: null,
        })
        iniciarSessao.mockResolvedValueOnce(categorias)
        escolherCategoria.mockResolvedValueOnce([])

        const result = await processIncomingMessage({ phone: "5511999999999", text: "1" })

        expect(updateNavigationState).not.toHaveBeenCalled()
        expect(result).toEqual({
            sessionId: "s1",
            newSession: false,
            reply: { text: formatarCategoriaSemPerguntas(), step: "AWAITING_CATEGORY" },
        })
    })

    test.each([["abc"], ["0"], ["99"], [undefined]])(
        "AWAITING_CATEGORY com texto inválido (%s) re-lista as categorias com erro",
        async (text) => {
            findOrCreateActive.mockResolvedValueOnce({
                id: "s1",
                created: false,
                currentStep: "AWAITING_CATEGORY",
                currentCategoryId: null,
            })
            iniciarSessao.mockResolvedValueOnce(categorias)

            const result = await processIncomingMessage({ phone: "5511999999999", text })

            expect(updateNavigationState).not.toHaveBeenCalled()
            expect(escolherCategoria).not.toHaveBeenCalled()
            expect(result).toEqual({
                sessionId: "s1",
                newSession: false,
                reply: { text: formatarErroCategoria(categorias), step: "AWAITING_CATEGORY" },
            })
        },
    )

    test("AWAITING_QUESTION com escolha numérica válida finaliza a sessão", async () => {
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_QUESTION",
            currentCategoryId: "1",
        })
        escolherCategoria.mockResolvedValueOnce(perguntas)
        processarPergunta.mockResolvedValueOnce(respostaFinal)

        const result = await processIncomingMessage({ phone: "5511999999999", text: "1" })

        expect(escolherCategoria).toHaveBeenCalledWith(1)
        expect(processarPergunta).toHaveBeenCalledWith(perguntas[0]?.id)
        expect(recordEvent).toHaveBeenCalledWith("s1", {
            type: "QUESTION_CHOSEN",
            categoryId: perguntas[0]?.category_id,
            questionId: perguntas[0]?.id,
        })
        expect(finishEvent).toHaveBeenCalledWith("s1", {
            outcome: "RESOLVED",
            event: {
                type: "ANSWER_SENT",
                categoryId: perguntas[0]?.category_id,
                questionId: perguntas[0]?.id,
                llm: "NOT_CALLED",
            },
        })
        expect(finish).not.toHaveBeenCalled()
        expect(result).toEqual({
            sessionId: "s1",
            newSession: false,
            reply: { text: formatarRespostaFinal(respostaFinal), step: "FINISHED" },
        })
    })

    test("AWAITING_QUESTION com texto inválido re-lista as perguntas da categoria atual", async () => {
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_QUESTION",
            currentCategoryId: "1",
        })
        escolherCategoria.mockResolvedValueOnce(perguntas)

        const result = await processIncomingMessage({ phone: "5511999999999", text: "abc" })

        expect(escolherCategoria).toHaveBeenCalledWith(1)
        expect(processarPergunta).not.toHaveBeenCalled()
        expect(finish).not.toHaveBeenCalled()
        expect(finishEvent).not.toHaveBeenCalled()
        expect(result).toEqual({
            sessionId: "s1",
            newSession: false,
            reply: { text: formatarErroPergunta(perguntas), step: "AWAITING_QUESTION" },
        })
    })

    test("conversa completa: nova sessão -> categoria -> pergunta -> resposta final mantém o mesmo sessionId", async () => {
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: true,
            currentStep: "AWAITING_CATEGORY",
            currentCategoryId: null,
        })
        iniciarSessao.mockResolvedValueOnce(categorias)

        const first = await processIncomingMessage({ phone: "5511999999999" })
        expect(first.sessionId).toBe("s1")
        expect(first.newSession).toBe(true)
        expect(first.reply.step).toBe("AWAITING_CATEGORY")

        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_CATEGORY",
            currentCategoryId: null,
        })
        iniciarSessao.mockResolvedValueOnce(categorias)
        escolherCategoria.mockResolvedValueOnce(perguntas)

        const second = await processIncomingMessage({ phone: "5511999999999", text: "1" })
        expect(second.sessionId).toBe("s1")
        expect(second.reply.step).toBe("AWAITING_QUESTION")

        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_QUESTION",
            currentCategoryId: String(categorias[0]?.id),
        })
        escolherCategoria.mockResolvedValueOnce(perguntas)
        processarPergunta.mockResolvedValueOnce(respostaFinal)

        const third = await processIncomingMessage({ phone: "5511999999999", text: "1" })
        expect(third.sessionId).toBe("s1")
        expect(third.reply.step).toBe("FINISHED")
        expect(finishEvent).toHaveBeenCalledWith("s1", expect.objectContaining({ outcome: "RESOLVED" }))
    })

    test("grava o desfecho fora de escopo na sessão", async () => {
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_QUESTION",
            currentCategoryId: "1",
        })
        escolherCategoria.mockResolvedValueOnce(perguntas)
        processarPergunta.mockResolvedValueOnce({
            ...respostaFinal,
            fora_de_escopo: true,
        })

        await processIncomingMessage({ phone: "5511999999999", text: "1" })

        expect(finishEvent).toHaveBeenCalledWith("s1", {
            outcome: "OUT_OF_SCOPE",
            event: { type: "ANSWER_SENT", categoryId: 1, questionId: 10, llm: "NOT_CALLED" },
        })
        expect(finish).not.toHaveBeenCalled()
    })

    test("AWAITING_QUESTION sem categoria reapresenta as categorias sem gravar outro STARTED", async () => {
        findOrCreateActive.mockResolvedValueOnce({
            id: "s1",
            created: false,
            currentStep: "AWAITING_QUESTION",
            currentCategoryId: null,
        })
        iniciarSessao.mockResolvedValueOnce(categorias)

        const result = await processIncomingMessage({ phone: "5500000000101", text: "1" })

        expect(recordEvent).not.toHaveBeenCalled()
        expect(finishEvent).not.toHaveBeenCalled()
        expect(result).toEqual({
            sessionId: "s1",
            newSession: false,
            reply: { text: formatarListaCategorias(categorias), step: "AWAITING_CATEGORY" },
        })
    })

    test("falha ao gravar a escolha de categoria não impede a lista de perguntas", async () => {
        const repository = new MockConversationEventRepository()
        repository.failWith(Object.assign(new Error("db down"), { code: "57P01" }))
        const realEvents = createConversationEventService({
            events: repository,
            sessions: { finish },
            logger,
        })
        const flow = createConversationFlowService({ sessions, events: realEvents, motor, hashPhone, logger })
        findOrCreateActive.mockResolvedValueOnce({
            id: "7",
            created: false,
            currentStep: "AWAITING_CATEGORY",
            currentCategoryId: null,
        })
        iniciarSessao.mockResolvedValueOnce(categorias)
        escolherCategoria.mockResolvedValueOnce(perguntas)

        const result = await flow({ phone: "5500000000101", text: "1" })

        expect(result).toEqual({
            sessionId: "7",
            newSession: false,
            reply: { text: formatarListaPerguntas(perguntas), step: "AWAITING_QUESTION" },
        })
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
        })
        escolherCategoria.mockResolvedValueOnce(perguntas)
        processarPergunta.mockResolvedValueOnce(respostaFinal)
        finishEvent.mockRejectedValueOnce(Object.assign(new Error(citizenText), { code: "23514" }))

        const result = await processIncomingMessage({ phone: "5500000000101", text: " 1 " })

        expect(result).toEqual({
            sessionId: "7",
            newSession: false,
            reply: { text: formatarRespostaFinal(respostaFinal), step: "FINISHED" },
        })
        expect(logger.error).toHaveBeenCalledOnce()
        expect(logger.error).toHaveBeenCalledWith(expect.any(String), {
            type: "ANSWER_SENT",
            sessionId: "7",
            code: "23514",
        })
        expect(JSON.stringify(logger.error.mock.calls)).not.toContain("Maria")
        expect(JSON.stringify(logger.error.mock.calls)).not.toContain("5500000000101")
    })

    test("nenhum texto livre do cidadão chega a qualquer repositório ou ao log", async () => {
        const sentinel = "Meu nome é Maria Fictícia e meu CPF é 000.000.000-00"
        const sessionCalls: unknown[] = []
        const recordingSessions: SessionRepository = {
            findOrCreateActive: async (...args) => {
                sessionCalls.push(["findOrCreateActive", args])
                return sessionState.shift() ?? { id: "9", created: false, currentStep: "FINISHED", currentCategoryId: null }
            },
            updateNavigationState: async (...args) => {
                sessionCalls.push(["updateNavigationState", args])
            },
            touch: async (...args) => {
                sessionCalls.push(["touch", args])
            },
            finish: async (...args) => {
                sessionCalls.push(["finish", args])
            },
        }
        const sessionState = [
            { id: "9", created: true, currentStep: "AWAITING_CATEGORY" as const, currentCategoryId: null },
            { id: "9", created: false, currentStep: "AWAITING_CATEGORY" as const, currentCategoryId: null },
            { id: "9", created: false, currentStep: "AWAITING_CATEGORY" as const, currentCategoryId: null },
            { id: "9", created: false, currentStep: "AWAITING_CATEGORY" as const, currentCategoryId: null },
            { id: "9", created: false, currentStep: "AWAITING_CATEGORY" as const, currentCategoryId: null },
            { id: "9", created: false, currentStep: "AWAITING_QUESTION" as const, currentCategoryId: "1" },
            { id: "9", created: false, currentStep: "AWAITING_QUESTION" as const, currentCategoryId: "1" },
            { id: "9", created: false, currentStep: "AWAITING_QUESTION" as const, currentCategoryId: "1" },
            { id: "9", created: false, currentStep: "AWAITING_QUESTION" as const, currentCategoryId: "1" },
        ]
        const repository = new MockConversationEventRepository()
        const realEvents = createConversationEventService({
            events: repository,
            sessions: recordingSessions,
            logger,
        })
        const flow = createConversationFlowService({
            sessions: recordingSessions,
            events: realEvents,
            motor,
            hashPhone: () => "hash-ficticio",
            logger,
        })
        iniciarSessao.mockResolvedValue(categorias)
        escolherCategoria.mockResolvedValue(perguntas)
        processarPergunta.mockResolvedValue(respostaFinal)
        const messages = [
            sentinel,
            sentinel,
            "1 " + sentinel,
            "abc",
            undefined,
            "1",
            sentinel,
            "1 " + sentinel,
            "2",
        ]

        for (const text of messages) {
            await flow({ phone: "5500000000101", text })
        }

        const everything = JSON.stringify([sessionCalls, repository.calls, logger.error.mock.calls])
        expect(everything).not.toContain(sentinel)
        expect(everything).not.toContain("Maria")
        expect(everything).not.toContain("000.000.000-00")
        expect(sessionCalls).toContainEqual([
            "finish",
            [
                "9",
                {
                    outcome: "RESOLVED",
                    event: { type: "ANSWER_SENT", categoryId: 1, questionId: 11, llm: "NOT_CALLED" },
                },
            ],
        ])
    })

    test("converte para número os ids que o Postgres devolve como texto antes de gravar os eventos", async () => {
        const perguntasDoBanco = perguntas.map((pergunta) => ({
            ...pergunta,
            id: String(pergunta.id),
            category_id: String(pergunta.category_id),
        })) as unknown as Pergunta[]
        const categoriasDoBanco = categorias.map((categoria) => ({
            ...categoria,
            id: String(categoria.id),
        })) as unknown as Categoria[]
        findOrCreateActive
            .mockResolvedValueOnce({ id: "7", created: false, currentStep: "AWAITING_CATEGORY", currentCategoryId: null })
            .mockResolvedValueOnce({ id: "7", created: false, currentStep: "AWAITING_QUESTION", currentCategoryId: "1" })
        iniciarSessao.mockResolvedValueOnce(categoriasDoBanco)
        escolherCategoria.mockResolvedValue(perguntasDoBanco)
        processarPergunta.mockResolvedValueOnce(respostaFinal)

        await processIncomingMessage({ phone: "5500000000101", text: "1" })
        await processIncomingMessage({ phone: "5500000000101", text: "1" })

        expect(recordEvent).toHaveBeenCalledWith("7", { type: "CATEGORY_CHOSEN", categoryId: 1 })
        expect(recordEvent).toHaveBeenCalledWith("7", { type: "QUESTION_CHOSEN", categoryId: 1, questionId: 10 })
        expect(finishEvent).toHaveBeenCalledWith("7", {
            outcome: "RESOLVED",
            event: { type: "ANSWER_SENT", categoryId: 1, questionId: 10, llm: "NOT_CALLED" },
        })
    })
})
