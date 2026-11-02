import { beforeEach, describe, expect, test, vi } from "vitest"
import { FIXED_NOW } from "../repositories/mock/appointment.builders"
import type { LlmExplicacaoResult } from "../types/llm.types"
import { createBackgroundRunner, createLlmComplementService } from "./llmComplement.service"
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

describe("conversationFlow: complemento por IA (#66)", () => {
    const harness = createConversationFlowHarness()
    const {
        findOrCreateActive,
        escolherCategoria,
        processarPergunta,
        recordEvent,
        finishEvent,
        scheduleComplement,
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

    function flowWithPendingComplement() {
        const deliver = createLlmComplementService({
            generate: () => new Promise<LlmExplicacaoResult>(() => {}),
            gateway: { sendText: vi.fn() },
            events: { record: vi.fn() },
            logger: { log: vi.fn() },
        })
        return createFlow({ scheduleComplement: createBackgroundRunner(deliver, { log: vi.fn() }) })
    }

    function answerSentCalls() {
        return recordEvent.mock.calls.filter(([, event]) => event.type === "ANSWER_SENT")
    }

    test.each([
        {
            label: "resolvida?",
            pergunta: perguntaComIa,
            resposta: respostaPadrao,
            otherEvents: [{ type: "QUESTION_CHOSEN", categoryId: 1, questionId: perguntaComIa.id }],
        },
        {
            label: "presencial",
            pergunta: perguntaPresencialComIa,
            resposta: respostaPresencial,
            otherEvents: [
                { type: "QUESTION_CHOSEN", categoryId: 1, questionId: perguntaPresencialComIa.id },
                { type: "SCHEDULE_OFFERED", reason: "REQUIRES_IN_PERSON" },
            ],
        },
    ])("com IA permitida entrega um job com o telefone sem espaços e não grava ANSWER_SENT (caminho $label)", async ({ pergunta, resposta, otherEvents }) => {
        chooseQuestion(pergunta, resposta)

        await processIncomingMessage({ phone: "  5500000000123  ", text: "1" })

        expect(scheduleComplement).toHaveBeenCalledExactlyOnceWith({
            phone: "5500000000123",
            sessionId: "s1",
            categoryId: 1,
            questionId: pergunta.id,
            resposta,
            answeredAt: FIXED_NOW,
        })
        expect(answerSentCalls()).toEqual([])
        expect(recordEvent.mock.calls).toEqual(otherEvents.map((event) => ["s1", event]))
    })

    test("pergunta fora do escopo encerra com ANSWER_SENT NOT_CALLED e não entrega job", async () => {
        chooseQuestion(perguntas[1] as typeof perguntaComIa, respostaForaEscopo)

        const result = await processIncomingMessage({ phone: "5500000000123", text: "1" })

        expect(result.reply.step).toBe("FINISHED")
        expect(finishEvent).toHaveBeenCalledExactlyOnceWith("s1", {
            outcome: "OUT_OF_SCOPE",
            event: { type: "ANSWER_SENT", categoryId: 1, questionId: 11, llm: "NOT_CALLED" },
        })
        expect(scheduleComplement).not.toHaveBeenCalled()
    })

    test.each([
        { label: "resolvida?", pergunta: perguntas[0] as typeof perguntaComIa, resposta: respostaPadrao },
        { label: "presencial", pergunta: perguntas[2] as typeof perguntaComIa, resposta: respostaPresencial },
    ])("com IA desligada grava ANSWER_SENT NOT_CALLED e não entrega job (caminho $label)", async ({ pergunta, resposta }) => {
        chooseQuestion(pergunta, resposta)

        await processIncomingMessage({ phone: "5500000000123", text: "1" })

        expect(answerSentCalls()).toEqual([
            ["s1", { type: "ANSWER_SENT", categoryId: 1, questionId: pergunta.id, llm: "NOT_CALLED" }],
        ])
        expect(scheduleComplement).not.toHaveBeenCalled()
    })

    test("com o complemento que nunca termina, resolve com a mesma reply de hoje", async () => {
        chooseQuestion({ ...perguntaComIa, llm_allowed: false }, respostaPadrao)
        const today = await processIncomingMessage({ phone: "5500000000123", text: "1" })
        chooseQuestion(perguntaComIa, respostaPadrao)

        const result = await flowWithPendingComplement()({ phone: "5500000000123", text: "1" })

        expect(result.reply).toEqual(today.reply)
    })

    test("com o complemento pendente, uma segunda mensagem do mesmo telefone é processada", async () => {
        const flow = flowWithPendingComplement()
        chooseQuestion(perguntaComIa, respostaPadrao)
        await flow({ phone: "5500000000123", text: "1" })
        chooseQuestion(perguntaComIa, respostaPadrao)

        const second = await flow({ phone: "5500000000123", text: "1" })

        expect(second.reply.step).toBe("AWAITING_RESOLVED")
    })

    test("lê o relógio depois de gravar QUESTION_CHOSEN e antes de gravar SCHEDULE_OFFERED", async () => {
        const nowSpy = vi.fn(() => FIXED_NOW)
        chooseQuestion(perguntaPresencialComIa, respostaPresencial)

        await createFlow({ now: nowSpy })({ phone: "5500000000123", text: "1" })

        const orderOf = (type: string) => {
            const index = recordEvent.mock.calls.findIndex(([, event]) => event.type === type)
            return recordEvent.mock.invocationCallOrder[index] as number
        }
        expect(nowSpy).toHaveBeenCalledTimes(1)
        const nowOrder = nowSpy.mock.invocationCallOrder[0] as number
        expect(nowOrder).toBeGreaterThan(orderOf("QUESTION_CHOSEN"))
        expect(nowOrder).toBeLessThan(orderOf("SCHEDULE_OFFERED"))
    })
})
