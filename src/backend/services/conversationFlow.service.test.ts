import { beforeEach, describe, expect, test, vi } from "vitest"
import { SessionRepository } from "../repositories/session.repository"
import { Categoria, Pergunta, RespostaFinalOutput } from "../types/motorDecisao.types"
import { createConversationFlowService, MotorDecisao } from "./conversationFlow.service"
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
    const finish = vi.fn()
    const sessions: SessionRepository = { findOrCreateActive, updateNavigationState, finish }

    const iniciarSessao = vi.fn()
    const escolherCategoria = vi.fn()
    const processarPergunta = vi.fn()
    const motor: MotorDecisao = { iniciarSessao, escolherCategoria, processarPergunta }

    const hashPhone = (phone: string) => `hash-${phone}`

    const processIncomingMessage = createConversationFlowService({ sessions, motor, hashPhone })

    beforeEach(() => {
        vi.clearAllMocks()
    })

    test("sessão nova ignora o texto recebido e devolve a lista de categorias", async () => {
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
        expect(finish).toHaveBeenCalledWith("s1")
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
        expect(finish).toHaveBeenCalledWith("s1")
    })
})
