import { beforeEach, describe, expect, test, vi } from "vitest"
import type { SendMessagesInput, SendMessagesResult } from "../clients/gateway.client"
import type { ConversationEvent, RecordedConversationEvent } from "../types/conversationEvent.types"
import type { LlmAnswerJob } from "../types/llm.types"
import { createLlmAnswerService } from "./llmAnswer.service"
import { mensagensRespostaOficial } from "./messageFormatter.service"
import { buildActiveSession, perguntaComIa, respostaPadrao } from "./mock/conversationFlow.fixtures"
import { createConversationFlowHarness } from "./mock/conversationFlowHarness"

const PHONE = "5500000000123"

const CREATED_AT = new Date("2026-03-10T12:00:00.000Z")

describe("conversationFlow: entrega real da resposta encadeada com o fluxo", () => {
    const harness = createConversationFlowHarness()
    const { findOrCreateActive, escolherCategoria, processarPergunta, recordEvent, finishEvent, listEvents, answerLogger, createFlow } =
        harness

    beforeEach(() => {
        vi.clearAllMocks()
    })

    function chooseQuestion() {
        findOrCreateActive.mockResolvedValueOnce(buildActiveSession({ currentStep: "AWAITING_QUESTION", currentCategoryId: "1" }))
        escolherCategoria.mockResolvedValueOnce([perguntaComIa])
        processarPergunta.mockResolvedValueOnce(respostaPadrao)
    }

    function nextMessageInResolved() {
        findOrCreateActive.mockResolvedValueOnce(
            buildActiveSession({ currentStep: "AWAITING_RESOLVED", currentCategoryId: "1", currentQuestionId: String(perguntaComIa.id) }),
        )
    }

    function deliveryWith(sendMessages: (input: SendMessagesInput) => Promise<SendMessagesResult>, record: (sessionId: string, event: ConversationEvent) => Promise<void>) {
        return createLlmAnswerService({
            llm: { isAvailable: async () => true },
            generate: async () => ({ explicacaoLlm: "Você pode cancelar em até 7 dias, conforme o Art. 49 do CDC.", geradoPorLlm: true, status: "USED" as const }),
            gateway: { sendMessages },
            events: { record },
            logger: { log: vi.fn() },
        })
    }

    function eventsSoFar(): RecordedConversationEvent[] {
        const questionChosen: RecordedConversationEvent = {
            type: "QUESTION_CHOSEN",
            categoryId: 1,
            questionId: perguntaComIa.id,
            createdAt: CREATED_AT,
        }
        const recorded = recordEvent.mock.calls
            .map(([, event]) => event as ConversationEvent)
            .filter((event) => event.type !== "QUESTION_CHOSEN")
            .map((event) => ({ ...event, createdAt: CREATED_AT }) as RecordedConversationEvent)
        return [questionChosen, ...recorded]
    }

    async function settle() {
        await new Promise((resolve) => setImmediate(resolve))
    }

    test("recupera com as mensagens oficiais e grava ANSWER_SENT FAILED quando a entrega falha nas duas chamadas ao gateway", async () => {
        const sendMessages = vi.fn<(input: SendMessagesInput) => Promise<SendMessagesResult>>().mockResolvedValue({
            ok: false,
            reason: "UNREACHABLE",
        })
        const deliver = deliveryWith(sendMessages, async (sessionId, event) => {
            recordEvent(sessionId, event)
        })
        const flow = createFlow({ deliverAnswer: (job: LlmAnswerJob) => deliver(job) })
        listEvents.mockImplementation(async () => eventsSoFar())
        chooseQuestion()
        await flow({ phone: PHONE, text: "1" })
        await settle()
        const eventsAfterDelivery = recordEvent.mock.calls.map(([, event]) => event.type)
        nextMessageInResolved()
        processarPergunta.mockResolvedValueOnce(respostaPadrao)

        const result = await flow({ phone: PHONE, text: "sim" })

        expect(sendMessages).toHaveBeenCalledTimes(2)
        expect(eventsAfterDelivery).toEqual(["QUESTION_CHOSEN"])
        expect(result.reply.step).toBe("AWAITING_RESOLVED")
        expect(result.reply.messages).toEqual(mensagensRespostaOficial(respostaPadrao))
        expect(recordEvent.mock.calls.at(-1)).toEqual([
            "s1",
            { type: "ANSWER_SENT", categoryId: 1, questionId: perguntaComIa.id, llm: "FAILED" },
        ])
        expect(answerLogger.log.mock.calls).toEqual([[JSON.stringify({ event: "answer_recovered", sessionId: "s1" })]])
        expect(finishEvent).not.toHaveBeenCalled()
    })

    test("responde só com digitando enquanto o ANSWER_SENT está sendo gravado e encerra o resolved_yes seguinte", async () => {
        let finishRecording!: () => void
        const recording = new Promise<void>((resolve) => {
            finishRecording = resolve
        })
        const sendMessages = vi.fn<(input: SendMessagesInput) => Promise<SendMessagesResult>>().mockResolvedValue({ ok: true })
        const deliver = deliveryWith(sendMessages, async (sessionId, event) => {
            recordEvent(sessionId, event)
            if (event.type === "ANSWER_SENT") {
                await recording
            }
        })
        const flow = createFlow({ deliverAnswer: (job: LlmAnswerJob) => deliver(job) })
        chooseQuestion()
        await flow({ phone: PHONE, text: "1" })
        await settle()
        nextMessageInResolved()

        const duringRecording = await flow({ phone: PHONE, optionId: "resolved_yes" })
        finishRecording()
        await settle()
        nextMessageInResolved()
        const afterRecording = await flow({ phone: PHONE, optionId: "resolved_yes" })

        expect(sendMessages).toHaveBeenCalledTimes(1)
        expect(duringRecording.reply).toEqual({ text: "", step: "AWAITING_RESOLVED", messages: [], typing: true })
        expect(finishEvent).toHaveBeenCalledExactlyOnceWith("s1", {
            outcome: "RESOLVED",
            event: { type: "RESOLVED_ANSWERED", resolved: true },
        })
        expect(afterRecording.reply.step).toBe("FINISHED")
    })
})
