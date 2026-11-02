import { describe, expect, it, vi } from "vitest"
import type { SendTextInput, SendTextResult } from "../clients/gateway.client"
import type { ConversationEvent } from "../types/conversationEvent.types"
import type { LlmComplementJob, LlmExplicacaoResult } from "../types/llm.types"
import type { RespostaFinalOutput } from "../types/motorDecisao.types"
import { createLlmComplementService } from "./llmComplement.service"
import { formatarComplementoIa, ROTULO_IA } from "./messageFormatter.service"

const resposta: RespostaFinalOutput = {
    categoria: "Contratos",
    pergunta: "Posso cancelar o contrato?",
    base_legal: "CDC, art. 49",
    resposta: "Sim, em até 7 dias.",
    documentos_necessarios: [],
    requer_presencial: false,
    fora_de_escopo: false,
}

const job: LlmComplementJob = {
    phone: "5500000000123",
    sessionId: "41",
    categoryId: 3,
    questionId: 7,
    resposta,
    answeredAt: new Date("2026-11-02T13:00:00.000Z"),
}

const sufixo = Array.from(`\n\n${ROTULO_IA}`).length

function setup({
    generated = { explicacaoLlm: "Explicação complementar.", geradoPorLlm: true, status: "USED" } as LlmExplicacaoResult,
    sent = { ok: true } as SendTextResult,
} = {}) {
    const generate = vi.fn<(input: RespostaFinalOutput) => Promise<LlmExplicacaoResult>>().mockResolvedValue(generated)
    const sendText = vi.fn<(input: SendTextInput) => Promise<SendTextResult>>().mockResolvedValue(sent)
    const record = vi.fn<(sessionId: string, event: ConversationEvent, occurredAt?: Date) => Promise<void>>().mockResolvedValue(undefined)
    const logger = { log: vi.fn() }
    const deliver = createLlmComplementService({ generate, gateway: { sendText }, events: { record }, logger })
    return { deliver, generate, sendText, record, logger }
}

function used(explicacaoLlm: string): LlmExplicacaoResult {
    return { explicacaoLlm, geradoPorLlm: true, status: "USED" }
}

describe("llmComplement.service", () => {
    it("envia a mensagem formatada com exatamente 4096 caracteres", async () => {
        const texto = "a".repeat(4096 - sufixo)
        const { deliver, sendText } = setup({ generated: used(texto) })

        await deliver(job)

        expect(Array.from(formatarComplementoIa(texto)).length).toBe(4096)
        expect(sendText).toHaveBeenCalledExactlyOnceWith({ to: job.phone, text: formatarComplementoIa(texto) })
    })

    it("não chama o gateway e grava FAILED quando a mensagem formatada tem 4097 caracteres", async () => {
        const { deliver, sendText, record } = setup({ generated: used("a".repeat(4097 - sufixo)) })

        await deliver(job)

        expect(sendText).not.toHaveBeenCalled()
        expect(record).toHaveBeenCalledExactlyOnceWith(
            job.sessionId,
            { type: "ANSWER_SENT", categoryId: job.categoryId, questionId: job.questionId, llm: "FAILED" },
            job.answeredAt,
        )
    })

    it("pede ao gateway o envio do complemento formatado uma única vez quando o gerador devolve USED", async () => {
        const { deliver, sendText } = setup({ generated: used("  Explicação complementar.\n") })

        await deliver(job)

        expect(sendText).toHaveBeenCalledExactlyOnceWith({ to: job.phone, text: "Explicação complementar.\n\nGerado com auxílio de IA" })
    })

    it("grava ANSWER_SENT com USED e o horário da resposta quando o gateway confirma o envio", async () => {
        const { deliver, record } = setup()

        await deliver(job)

        expect(record).toHaveBeenCalledExactlyOnceWith(
            job.sessionId,
            { type: "ANSWER_SENT", categoryId: job.categoryId, questionId: job.questionId, llm: "USED" },
            job.answeredAt,
        )
    })

    it("não chama o gateway e grava FAILED com o horário da resposta quando o gerador falha", async () => {
        const { deliver, sendText, record } = setup({
            generated: { explicacaoLlm: null, geradoPorLlm: false, status: "FAILED" },
        })

        await deliver(job)

        expect(sendText).not.toHaveBeenCalled()
        expect(record).toHaveBeenCalledExactlyOnceWith(
            job.sessionId,
            { type: "ANSWER_SENT", categoryId: job.categoryId, questionId: job.questionId, llm: "FAILED" },
            job.answeredAt,
        )
    })

    it.each(["NOT_CONFIGURED", "REJECTED", "UNREACHABLE"] as const)(
        "grava FAILED quando o gateway não entrega o complemento (%s)",
        async (reason) => {
            const { deliver, record } = setup({ sent: { ok: false, reason } })

            await deliver(job)

            expect(record).toHaveBeenCalledExactlyOnceWith(
                job.sessionId,
                { type: "ANSWER_SENT", categoryId: job.categoryId, questionId: job.questionId, llm: "FAILED" },
                job.answeredAt,
            )
        },
    )

    it.each([
        {
            reason: "LLM_FAILED",
            generated: { explicacaoLlm: null, geradoPorLlm: false, status: "FAILED" } as LlmExplicacaoResult,
            sent: { ok: true } as SendTextResult,
        },
        { reason: "TOO_LONG", generated: used(`Explicação ${"a".repeat(4096)}`), sent: { ok: true } as SendTextResult },
        { reason: "NOT_CONFIGURED", generated: used("Explicação complementar."), sent: { ok: false, reason: "NOT_CONFIGURED" } as SendTextResult },
        { reason: "REJECTED", generated: used("Explicação complementar."), sent: { ok: false, reason: "REJECTED" } as SendTextResult },
        { reason: "UNREACHABLE", generated: used("Explicação complementar."), sent: { ok: false, reason: "UNREACHABLE" } as SendTextResult },
    ])("registra no log a falha $reason sem o telefone nem o texto gerado", async ({ reason, generated, sent }) => {
        const { deliver, logger } = setup({ generated, sent })

        await deliver(job)

        expect(logger.log).toHaveBeenCalledOnce()
        expect(JSON.parse(String(logger.log.mock.calls[0]?.[0]))).toEqual({
            event: "llm_complement_failed",
            sessionId: job.sessionId,
            reason,
        })
        const logged = JSON.stringify(logger.log.mock.calls)
        expect(logged).not.toContain(job.phone)
        expect(logged).not.toContain("Explicação")
    })

    it("não registra falha no log quando o complemento é entregue", async () => {
        const { deliver, logger } = setup()

        await deliver(job)

        expect(logger.log).not.toHaveBeenCalled()
    })
})
