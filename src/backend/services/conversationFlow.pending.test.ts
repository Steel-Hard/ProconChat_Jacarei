import { beforeEach, describe, expect, test, vi } from "vitest"
import { GATEWAY_SEND_TIMEOUT_MS } from "../clients/gateway.client"
import { LLM_PROBE_TIMEOUT_MS, llmTimeoutMs } from "../clients/ollamaLlm.client"
import type { RecordedConversationEvent } from "../types/conversationEvent.types"
import { formatarRespostaFinal, mensagensRespostaOficial, OFERTA_AGENDAMENTO, PERGUNTA_RESOLVIDA } from "./messageFormatter.service"
import {
    buildActiveSession,
    perguntaComIa,
    perguntaPresencialComIa,
    respostaPadrao,
    respostaPresencial,
} from "./mock/conversationFlow.fixtures"
import { createConversationFlowHarness } from "./mock/conversationFlowHarness"

const PHONE = "5500000000123"

const CREATED_AT = new Date("2026-03-10T12:00:00.000Z")

const questionChosen: RecordedConversationEvent = {
    type: "QUESTION_CHOSEN",
    categoryId: 1,
    questionId: perguntaComIa.id,
    createdAt: CREATED_AT,
}

function deferred() {
    let resolve!: () => void
    let reject!: (error: Error) => void
    const promise = new Promise<void>((res, rej) => {
        resolve = res
        reject = rej
    })
    return { promise, resolve, reject }
}

describe("conversationFlow: mensagem durante a resposta pendente", () => {
    const harness = createConversationFlowHarness()
    const {
        findOrCreateActive,
        escolherCategoria,
        processarPergunta,
        recordEvent,
        finishEvent,
        updateNavigationState,
        listEvents,
        answerLogger,
        createFlow,
    } = harness

    beforeEach(() => {
        vi.clearAllMocks()
    })

    function chooseQuestionWithIa() {
        findOrCreateActive.mockResolvedValueOnce(buildActiveSession({ currentStep: "AWAITING_QUESTION", currentCategoryId: "1" }))
        escolherCategoria.mockResolvedValueOnce([perguntaComIa])
        processarPergunta.mockResolvedValueOnce(respostaPadrao)
    }

    function nextMessageIn(currentStep: "AWAITING_RESOLVED" | "AWAITING_SCHEDULE_OFFER") {
        findOrCreateActive.mockResolvedValueOnce(
            buildActiveSession({ currentStep, currentCategoryId: "1", currentQuestionId: String(perguntaComIa.id) }),
        )
    }

    test("responde só com o indicador de digitação e não interpreta um sim enquanto a resposta está pendente", async () => {
        const flow = createFlow({ deliverAnswer: vi.fn(() => new Promise<void>(() => {})) })
        chooseQuestionWithIa()
        await flow({ phone: PHONE, text: "1" })
        vi.clearAllMocks()
        nextMessageIn("AWAITING_RESOLVED")

        const result = await flow({ phone: PHONE, text: "sim" })

        expect(result.reply).toEqual({ text: "", step: "AWAITING_RESOLVED", messages: [], typing: true })
        expect(updateNavigationState).not.toHaveBeenCalled()
        expect(recordEvent).not.toHaveBeenCalled()
        expect(finishEvent).not.toHaveBeenCalled()
    })

    test.each([
        { label: "resolve", finish: (delivery: ReturnType<typeof deferred>) => delivery.resolve() },
        { label: "rejeita", finish: (delivery: ReturnType<typeof deferred>) => delivery.reject(new Error("falhou")) },
    ])("libera a sessão quando a entrega $label e o Sim seguinte encerra como RESOLVED", async ({ finish }) => {
        const delivery = deferred()
        const flow = createFlow({ deliverAnswer: vi.fn(() => delivery.promise) })
        chooseQuestionWithIa()
        await flow({ phone: PHONE, text: "1" })
        nextMessageIn("AWAITING_RESOLVED")
        const duringDelivery = await flow({ phone: PHONE, optionId: "resolved_yes" })
        finish(delivery)
        await delivery.promise.catch(() => undefined)
        await new Promise((resolve) => setImmediate(resolve))
        nextMessageIn("AWAITING_RESOLVED")

        const afterDelivery = await flow({ phone: PHONE, optionId: "resolved_yes" })

        expect(duringDelivery.reply).toEqual({ text: "", step: "AWAITING_RESOLVED", messages: [], typing: true })
        expect(afterDelivery.reply.step).toBe("FINISHED")
        expect(finishEvent).toHaveBeenCalledExactlyOnceWith("s1", {
            outcome: "RESOLVED",
            event: { type: "RESOLVED_ANSWERED", resolved: true },
        })
    })

    test("reenvia as mensagens oficiais e grava ANSWER_SENT FAILED quando a última escolha ficou sem resposta", async () => {
        nextMessageIn("AWAITING_RESOLVED")
        listEvents.mockResolvedValueOnce([questionChosen])
        processarPergunta.mockResolvedValueOnce(respostaPadrao)

        const result = await createFlow()({ phone: PHONE, text: "sim" })

        expect(result.reply).toEqual({
            text: `${formatarRespostaFinal(respostaPadrao)}\n\n${PERGUNTA_RESOLVIDA}`,
            step: "AWAITING_RESOLVED",
            messages: mensagensRespostaOficial(respostaPadrao),
        })
        expect(processarPergunta).toHaveBeenCalledExactlyOnceWith(perguntaComIa.id)
        expect(recordEvent.mock.calls).toEqual([
            ["s1", { type: "ANSWER_SENT", categoryId: 1, questionId: perguntaComIa.id, llm: "FAILED" }],
        ])
        expect(answerLogger.log.mock.calls).toEqual([[JSON.stringify({ event: "answer_recovered", sessionId: "s1" })]])
        expect(finishEvent).not.toHaveBeenCalled()
        expect(updateNavigationState).not.toHaveBeenCalled()
    })

    test("reenvia as mensagens oficiais da pergunta presencial e grava SCHEDULE_OFFERED depois do ANSWER_SENT", async () => {
        findOrCreateActive.mockResolvedValueOnce(
            buildActiveSession({
                currentStep: "AWAITING_SCHEDULE_OFFER",
                currentCategoryId: "1",
                currentQuestionId: String(perguntaPresencialComIa.id),
            }),
        )
        listEvents.mockResolvedValueOnce([{ ...questionChosen, questionId: perguntaPresencialComIa.id }])
        processarPergunta.mockResolvedValueOnce(respostaPresencial)

        const result = await createFlow()({ phone: PHONE, optionId: "schedule_yes" })

        expect(result.reply).toEqual({
            text: `${formatarRespostaFinal(respostaPresencial)}\n\n${OFERTA_AGENDAMENTO}`,
            step: "AWAITING_SCHEDULE_OFFER",
            messages: mensagensRespostaOficial(respostaPresencial),
        })
        expect(recordEvent.mock.calls).toEqual([
            ["s1", { type: "ANSWER_SENT", categoryId: 1, questionId: perguntaPresencialComIa.id, llm: "FAILED" }],
            ["s1", { type: "SCHEDULE_OFFERED", reason: "REQUIRES_IN_PERSON" }],
        ])
        expect(answerLogger.log.mock.calls).toEqual([[JSON.stringify({ event: "answer_recovered", sessionId: "s1" })]])
        expect(updateNavigationState).not.toHaveBeenCalled()
    })

    test("interpreta o sim como hoje quando já há ANSWER_SENT depois da última escolha", async () => {
        nextMessageIn("AWAITING_RESOLVED")
        listEvents.mockResolvedValueOnce([
            questionChosen,
            { type: "ANSWER_SENT", categoryId: 1, questionId: perguntaComIa.id, llm: "USED", createdAt: CREATED_AT },
        ])

        const result = await createFlow()({ phone: PHONE, text: "sim" })

        expect(result.reply.step).toBe("FINISHED")
        expect(processarPergunta).not.toHaveBeenCalled()
        expect(finishEvent).toHaveBeenCalledExactlyOnceWith("s1", {
            outcome: "RESOLVED",
            event: { type: "RESOLVED_ANSWERED", resolved: true },
        })
        expect(answerLogger.log).not.toHaveBeenCalled()
    })

    test("recusa o agendamento como hoje quando a oferta veio do Não em A dúvida foi resolvida?", async () => {
        nextMessageIn("AWAITING_SCHEDULE_OFFER")
        listEvents.mockResolvedValueOnce([
            questionChosen,
            { type: "ANSWER_SENT", categoryId: 1, questionId: perguntaComIa.id, llm: "USED", createdAt: CREATED_AT },
            { type: "RESOLVED_ANSWERED", resolved: false, createdAt: CREATED_AT },
            { type: "SCHEDULE_OFFERED", reason: "NOT_RESOLVED", createdAt: CREATED_AT },
        ])

        const result = await createFlow()({ phone: PHONE, optionId: "schedule_no" })

        expect(result.reply.step).toBe("FINISHED")
        expect(processarPergunta).not.toHaveBeenCalled()
        expect(finishEvent).toHaveBeenCalledExactlyOnceWith("s1", { outcome: "DECLINED", event: { type: "SCHEDULE_DECLINED" } })
        expect(answerLogger.log).not.toHaveBeenCalled()
    })

    test("considera a pendência vencida depois de 2000 ms + LLM_TIMEOUT_MS + 2 envios ao gateway e recupera a resposta", async () => {
        const maxAgeMs = LLM_PROBE_TIMEOUT_MS + llmTimeoutMs() + 2 * GATEWAY_SEND_TIMEOUT_MS
        let clock = CREATED_AT.getTime()
        const flow = createFlow({ deliverAnswer: vi.fn(() => new Promise<void>(() => {})), now: () => new Date(clock) })
        chooseQuestionWithIa()
        await flow({ phone: PHONE, text: "1" })
        vi.clearAllMocks()
        clock = CREATED_AT.getTime() + maxAgeMs - 1
        nextMessageIn("AWAITING_RESOLVED")
        const beforeLimit = await flow({ phone: PHONE, text: "sim" })
        clock = CREATED_AT.getTime() + maxAgeMs + 1
        nextMessageIn("AWAITING_RESOLVED")
        listEvents.mockResolvedValueOnce([questionChosen])
        processarPergunta.mockResolvedValueOnce(respostaPadrao)

        const afterLimit = await flow({ phone: PHONE, text: "sim" })

        expect(beforeLimit.reply).toEqual({ text: "", step: "AWAITING_RESOLVED", messages: [], typing: true })
        expect(afterLimit.reply.messages).toEqual(mensagensRespostaOficial(respostaPadrao))
        expect(recordEvent.mock.calls).toEqual([
            ["s1", { type: "ANSWER_SENT", categoryId: 1, questionId: perguntaComIa.id, llm: "FAILED" }],
        ])
    })
})
