import { beforeEach, describe, expect, test, vi } from "vitest"
import {
    criarBotoesOfertaAgendamento,
    criarBotoesResolvida,
    formatarRespostaFinal,
    OFERTA_AGENDAMENTO,
    PERGUNTA_RESOLVIDA,
} from "./messageFormatter.service"
import {
    buildActiveSession,
    perguntaComIa,
    perguntaPresencialComIa,
    perguntas,
    respostaForaEscopo,
    respostaPadrao,
    respostaPresencial,
} from "./mock/conversationFlow.fixtures"
import { createConversationFlowHarness } from "./mock/conversationFlowHarness"

describe("conversationFlow: resposta escrita pela IA", () => {
    const harness = createConversationFlowHarness()
    const {
        findOrCreateActive,
        escolherCategoria,
        processarPergunta,
        recordEvent,
        finishEvent,
        updateNavigationState,
        deliverAnswer,
        answerLogger,
        processIncomingMessage,
        createFlow,
    } = harness

    beforeEach(() => {
        vi.clearAllMocks()
    })

    function chooseQuestion(pergunta: typeof perguntaComIa, resposta: typeof respostaPadrao) {
        findOrCreateActive.mockResolvedValueOnce(buildActiveSession({ currentStep: "AWAITING_QUESTION", currentCategoryId: "1" }))
        escolherCategoria.mockResolvedValueOnce([pergunta])
        processarPergunta.mockResolvedValueOnce(resposta)
    }

    function flowWithPendingAnswer() {
        return createFlow({ deliverAnswer: vi.fn(() => new Promise<void>(() => {})) })
    }

    function answerSentCalls() {
        return recordEvent.mock.calls.filter(([, event]) => event.type === "ANSWER_SENT")
    }

    test.each([
        { label: "resolvida?", pergunta: perguntaComIa, resposta: respostaPadrao, step: "AWAITING_RESOLVED" },
        { label: "presencial", pergunta: perguntaPresencialComIa, resposta: respostaPresencial, step: "AWAITING_SCHEDULE_OFFER" },
    ])("com a entrega que nunca termina, responde só com o indicador de digitação (caminho $label)", async ({ pergunta, resposta, step }) => {
        chooseQuestion(pergunta, resposta)

        const result = await flowWithPendingAnswer()({ phone: "5500000000123", text: "1" })

        expect(result.reply).toEqual({ text: "", step, messages: [], typing: true })
    })

    test.each([
        { label: "resolvida?", pergunta: perguntaComIa, resposta: respostaPadrao, step: "AWAITING_RESOLVED" },
        { label: "presencial", pergunta: perguntaPresencialComIa, resposta: respostaPresencial, step: "AWAITING_SCHEDULE_OFFER" },
    ])("grava só QUESTION_CHOSEN, atualiza o passo e chama a entrega uma vez com o telefone sem espaços (caminho $label)", async ({ pergunta, resposta, step }) => {
        const deliver = vi.fn(() => new Promise<void>(() => {}))
        chooseQuestion(pergunta, resposta)

        await createFlow({ deliverAnswer: deliver })({ phone: "  5512999990000 ", text: "1" })

        expect(recordEvent.mock.calls).toEqual([["s1", { type: "QUESTION_CHOSEN", categoryId: 1, questionId: pergunta.id }]])
        expect(updateNavigationState).toHaveBeenCalledExactlyOnceWith("s1", {
            currentStep: step,
            currentCategoryId: "1",
            currentQuestionId: String(pergunta.id),
        })
        expect(deliver).toHaveBeenCalledExactlyOnceWith({
            phone: "5512999990000",
            sessionId: "s1",
            categoryId: 1,
            questionId: pergunta.id,
            resposta,
        })
    })

    test("registra llm_answer_failed sem o telefone quando a entrega rejeita e libera a sessão para a próxima mensagem", async () => {
        const flow = createFlow({ deliverAnswer: vi.fn(async () => Promise.reject(new Error("falha 5500000000123"))) })
        chooseQuestion(perguntaComIa, respostaPadrao)
        await flow({ phone: "5500000000123", text: "1" })
        await vi.waitFor(() => expect(answerLogger.log).toHaveBeenCalled())
        findOrCreateActive.mockResolvedValueOnce(buildActiveSession({ currentStep: "AWAITING_RESOLVED", currentQuestionId: String(perguntaComIa.id) }))

        const next = await flow({ phone: "5500000000123", optionId: "resolved_yes" })

        expect(answerLogger.log.mock.calls).toEqual([[JSON.stringify({ event: "llm_answer_failed", sessionId: "s1" })]])
        expect(JSON.stringify(answerLogger.log.mock.calls)).not.toContain("5500000000123")
        expect(next.reply.step).toBe("FINISHED")
    })

    test("pergunta fora do escopo encerra com ANSWER_SENT NOT_CALLED e não chama a entrega", async () => {
        chooseQuestion(perguntas[1] as typeof perguntaComIa, respostaForaEscopo)

        const result = await processIncomingMessage({ phone: "5500000000123", text: "1" })

        expect(result.reply.step).toBe("FINISHED")
        expect(finishEvent).toHaveBeenCalledExactlyOnceWith("s1", {
            outcome: "OUT_OF_SCOPE",
            event: { type: "ANSWER_SENT", categoryId: 1, questionId: 11, llm: "NOT_CALLED" },
        })
        expect(deliverAnswer).not.toHaveBeenCalled()
    })

    test.each([
        { label: "resolvida?", pergunta: perguntas[0] as typeof perguntaComIa, resposta: respostaPadrao },
        { label: "presencial", pergunta: perguntas[2] as typeof perguntaComIa, resposta: respostaPresencial },
    ])("com IA desligada grava ANSWER_SENT NOT_CALLED e não chama a entrega (caminho $label)", async ({ pergunta, resposta }) => {
        chooseQuestion(pergunta, resposta)

        await processIncomingMessage({ phone: "5500000000123", text: "1" })

        expect(answerSentCalls()).toEqual([
            ["s1", { type: "ANSWER_SENT", categoryId: 1, questionId: pergunta.id, llm: "NOT_CALLED" }],
        ])
        expect(deliverAnswer).not.toHaveBeenCalled()
    })

    test.each([
        {
            label: "resolvida?",
            pergunta: perguntas[0] as typeof perguntaComIa,
            resposta: respostaPadrao,
            reply: {
                text: `${formatarRespostaFinal(respostaPadrao)}\n\n${PERGUNTA_RESOLVIDA}`,
                step: "AWAITING_RESOLVED",
                messages: [
                    { type: "text", text: formatarRespostaFinal(respostaPadrao) },
                    { type: "buttons", text: "A dúvida foi resolvida?", buttons: criarBotoesResolvida() },
                ],
            },
        },
        {
            label: "presencial",
            pergunta: perguntas[2] as typeof perguntaComIa,
            resposta: respostaPresencial,
            reply: {
                text: `${formatarRespostaFinal(respostaPresencial)}\n\n${OFERTA_AGENDAMENTO}`,
                step: "AWAITING_SCHEDULE_OFFER",
                messages: [
                    { type: "text", text: formatarRespostaFinal(respostaPresencial) },
                    {
                        type: "buttons",
                        text: "Deseja agendar um atendimento presencial no PROCON Jacareí?",
                        buttons: criarBotoesOfertaAgendamento(),
                    },
                ],
            },
        },
    ])("com IA desligada devolve a mesma reply de hoje (caminho $label)", async ({ pergunta, resposta, reply }) => {
        chooseQuestion(pergunta, resposta)

        const result = await processIncomingMessage({ phone: "5500000000123", text: "1" })

        expect(result.reply).toEqual(reply)
    })
})
