import { afterEach, describe, expect, it, vi } from "vitest"
import { OllamaLlmClient } from "../clients/ollamaLlm.client"
import type { SendMessagesInput, SendMessagesResult } from "../clients/gateway.client"
import type { ConversationEvent } from "../types/conversationEvent.types"
import type { LlmAnswerJob, LlmExplicacaoResult } from "../types/llm.types"
import type { RespostaFinalOutput } from "../types/motorDecisao.types"
import { createLlmAnswerService } from "./llmAnswer.service"
import { createLlmExplicacaoService } from "./llmExplicacao.service"
import { montarMensagemIa, mensagensRespostaOficial } from "./messageFormatter.service"

const resposta: RespostaFinalOutput = {
    categoria: "Vício/Defeito de Produto ou Serviço",
    pergunta: "Comprei um produto com defeito, o que fazer?",
    base_legal: "Art. 18 do CDC",
    resposta: "Você tem até 30 dias para reclamar do defeito ao fornecedor.",
    documentos_necessarios: ["Nota fiscal"],
    requer_presencial: false,
    fora_de_escopo: false,
}

const job: LlmAnswerJob = {
    phone: "5500000000123",
    sessionId: "41",
    categoryId: 3,
    questionId: 7,
    resposta,
}

const TEXTO_IA = "Você pode reclamar do defeito ao fornecedor em até 30 dias."

function textoComCorpoDe(tamanho: number): string {
    const prefixo = "Prazo de 30 dias "
    const semTexto = Array.from((montarMensagemIa("", resposta) as { text: string }).text).length
    return prefixo + "a".repeat(tamanho - semTexto - Array.from(prefixo).length)
}

function used(explicacaoLlm: string): LlmExplicacaoResult {
    return { explicacaoLlm, geradoPorLlm: true, status: "USED" }
}

function setup({
    available = true,
    generated = used(TEXTO_IA),
    sent = [{ ok: true }] as SendMessagesResult[],
}: { available?: boolean; generated?: LlmExplicacaoResult; sent?: SendMessagesResult[] } = {}) {
    const isAvailable = vi.fn<() => Promise<boolean>>().mockResolvedValue(available)
    const generate = vi.fn<(input: RespostaFinalOutput) => Promise<LlmExplicacaoResult>>().mockResolvedValue(generated)
    const sendMessages = vi.fn<(input: SendMessagesInput) => Promise<SendMessagesResult>>()
    for (const result of sent) {
        sendMessages.mockResolvedValueOnce(result)
    }
    const record = vi.fn<(sessionId: string, event: ConversationEvent, occurredAt?: Date) => Promise<void>>().mockResolvedValue(undefined)
    const logger = { log: vi.fn() }
    const deliver = createLlmAnswerService({ llm: { isAvailable }, generate, gateway: { sendMessages }, events: { record }, logger })
    return { deliver, isAvailable, generate, sendMessages, record, logger }
}

describe("llmAnswer.service", () => {
    it("envia uma única vez a mensagem da IA e grava ANSWER_SENT USED sem horário próprio", async () => {
        const { deliver, sendMessages, record } = setup()

        await deliver(job)

        expect(sendMessages).toHaveBeenCalledExactlyOnceWith({ to: job.phone, messages: [montarMensagemIa(TEXTO_IA, resposta)] })
        expect(record.mock.calls).toEqual([
            [job.sessionId, { type: "ANSWER_SENT", categoryId: job.categoryId, questionId: job.questionId, llm: "USED" }],
        ])
    })

    it("não gera, envia as mensagens oficiais, grava FAILED e loga LLM_UNAVAILABLE quando o Ollama não responde à sondagem", async () => {
        const { deliver, generate, sendMessages, record, logger } = setup({ available: false })

        await deliver(job)

        expect(generate).not.toHaveBeenCalled()
        expect(sendMessages).toHaveBeenCalledExactlyOnceWith({ to: job.phone, messages: mensagensRespostaOficial(resposta) })
        expect(record.mock.calls).toEqual([
            [job.sessionId, { type: "ANSWER_SENT", categoryId: job.categoryId, questionId: job.questionId, llm: "FAILED" }],
        ])
        expect(logger.log.mock.calls).toEqual([
            [JSON.stringify({ event: "llm_answer_fallback", sessionId: job.sessionId, reason: "LLM_UNAVAILABLE" })],
        ])
    })

    it.each([
        { caso: "o gerador devolve FAILED", generated: { explicacaoLlm: null, geradoPorLlm: false, status: "FAILED" } as LlmExplicacaoResult, reason: "LLM_FAILED" },
        { caso: "o texto só tem espaços e quebras", generated: used("  \n\n  \n"), reason: "LLM_FAILED" },
        { caso: "o texto tem um número diferente", generated: used("Você pode reclamar em até 45 dias."), reason: "FACTS_MISMATCH" },
    ])("envia só as mensagens oficiais, grava FAILED e loga $reason quando $caso", async ({ generated, reason }) => {
        const { deliver, sendMessages, record, logger } = setup({ generated })

        await deliver(job)

        expect(sendMessages).toHaveBeenCalledExactlyOnceWith({ to: job.phone, messages: mensagensRespostaOficial(resposta) })
        expect(record.mock.calls).toEqual([
            [job.sessionId, { type: "ANSWER_SENT", categoryId: job.categoryId, questionId: job.questionId, llm: "FAILED" }],
        ])
        expect(logger.log.mock.calls).toEqual([[JSON.stringify({ event: "llm_answer_fallback", sessionId: job.sessionId, reason })]])
    })

    it("envia as mensagens oficiais depois que o gateway recusa a mensagem da IA, grava FAILED e loga REJECTED", async () => {
        const { deliver, sendMessages, record, logger } = setup({ sent: [{ ok: false, reason: "REJECTED" }, { ok: true }] })

        await deliver(job)

        expect(sendMessages.mock.calls).toEqual([
            [{ to: job.phone, messages: [montarMensagemIa(TEXTO_IA, resposta)] }],
            [{ to: job.phone, messages: mensagensRespostaOficial(resposta) }],
        ])
        expect(record.mock.calls).toEqual([
            [job.sessionId, { type: "ANSWER_SENT", categoryId: job.categoryId, questionId: job.questionId, llm: "FAILED" }],
        ])
        expect(logger.log.mock.calls).toEqual([
            [JSON.stringify({ event: "llm_answer_fallback", sessionId: job.sessionId, reason: "REJECTED" })],
        ])
    })

    it("envia a mensagem da IA quando o corpo montado tem exatamente 1024 caracteres", async () => {
        const texto = textoComCorpoDe(1024)
        const mensagem = montarMensagemIa(texto, resposta) as { text: string }
        const { deliver, sendMessages, logger } = setup({ generated: used(texto) })

        await deliver(job)

        expect(Array.from(mensagem.text).length).toBe(1024)
        expect(sendMessages).toHaveBeenCalledExactlyOnceWith({ to: job.phone, messages: [mensagem] })
        expect(logger.log).not.toHaveBeenCalled()
    })

    it("envia as mensagens oficiais e loga TOO_LONG quando o corpo montado tem 1025 caracteres", async () => {
        const texto = textoComCorpoDe(1025)
        const { deliver, sendMessages, record, logger } = setup({ generated: used(texto) })

        await deliver(job)

        expect(Array.from((montarMensagemIa(texto, resposta) as { text: string }).text).length).toBe(1025)
        expect(sendMessages).toHaveBeenCalledExactlyOnceWith({ to: job.phone, messages: mensagensRespostaOficial(resposta) })
        expect(record.mock.calls).toEqual([
            [job.sessionId, { type: "ANSWER_SENT", categoryId: job.categoryId, questionId: job.questionId, llm: "FAILED" }],
        ])
        expect(logger.log.mock.calls).toEqual([
            [JSON.stringify({ event: "llm_answer_fallback", sessionId: job.sessionId, reason: "TOO_LONG" })],
        ])
    })

    it("não grava ANSWER_SENT e loga answer_delivery_failed quando a mensagem da IA e as oficiais falham", async () => {
        const { deliver, sendMessages, record, logger } = setup({
            sent: [
                { ok: false, reason: "UNREACHABLE" },
                { ok: false, reason: "REJECTED" },
            ],
        })

        await deliver(job)

        expect(sendMessages).toHaveBeenCalledTimes(2)
        expect(record).not.toHaveBeenCalled()
        expect(logger.log.mock.calls).toEqual([
            [JSON.stringify({ event: "answer_delivery_failed", sessionId: job.sessionId, reason: "REJECTED" })],
        ])
    })

    it("grava SCHEDULE_OFFERED REQUIRES_IN_PERSON depois do ANSWER_SENT quando a pergunta presencial é respondida", async () => {
        const presencial = { ...job, resposta: { ...resposta, requer_presencial: true } }
        const { deliver, record } = setup()

        await deliver(presencial)

        expect(record.mock.calls).toEqual([
            [job.sessionId, { type: "ANSWER_SENT", categoryId: job.categoryId, questionId: job.questionId, llm: "USED" }],
            [job.sessionId, { type: "SCHEDULE_OFFERED", reason: "REQUIRES_IN_PERSON" }],
        ])
    })

    it("envia as duas mensagens oficiais e grava ANSWER_SENT FAILED antes de SCHEDULE_OFFERED quando a pergunta presencial passa do limite de 1024", async () => {
        const respostaPresencial = { ...resposta, requer_presencial: true }
        const presencial = { ...job, resposta: respostaPresencial }
        const texto = textoComCorpoDe(1025)
        const { deliver, sendMessages, record, logger } = setup({ generated: used(texto) })

        await deliver(presencial)

        expect(Array.from((montarMensagemIa(texto, respostaPresencial) as { text: string }).text).length).toBeGreaterThan(1024)
        expect(sendMessages).toHaveBeenCalledExactlyOnceWith({ to: job.phone, messages: mensagensRespostaOficial(respostaPresencial) })
        expect(sendMessages.mock.calls[0]?.[0].messages).toHaveLength(2)
        expect(record.mock.calls).toEqual([
            [job.sessionId, { type: "ANSWER_SENT", categoryId: job.categoryId, questionId: job.questionId, llm: "FAILED" }],
            [job.sessionId, { type: "SCHEDULE_OFFERED", reason: "REQUIRES_IN_PERSON" }],
        ])
        expect(logger.log.mock.calls).toEqual([
            [JSON.stringify({ event: "llm_answer_fallback", sessionId: job.sessionId, reason: "TOO_LONG" })],
        ])
    })

    it("não grava SCHEDULE_OFFERED quando a pergunta presencial não teve resposta entregue", async () => {
        const presencial = { ...job, resposta: { ...resposta, requer_presencial: true } }
        const { deliver, record } = setup({
            sent: [
                { ok: false, reason: "UNREACHABLE" },
                { ok: false, reason: "UNREACHABLE" },
            ],
        })

        await deliver(presencial)

        expect(record).not.toHaveBeenCalled()
    })

    it("envia as oficiais na hora e loga LLM_BUSY quando já há uma geração em andamento, e volta a gerar depois que ela termina", async () => {
        let terminarPrimeira!: (value: LlmExplicacaoResult) => void
        const { deliver, isAvailable, generate, sendMessages, logger } = setup({ sent: [{ ok: true }, { ok: true }, { ok: true }, { ok: true }] })
        generate.mockImplementationOnce(
            () =>
                new Promise<LlmExplicacaoResult>((resolve) => {
                    terminarPrimeira = resolve
                }),
        )
        const segundoJob = { ...job, sessionId: "42", phone: "5500000000456" }

        const primeira = deliver(job)
        await vi.waitFor(() => expect(generate).toHaveBeenCalledOnce())
        await deliver(segundoJob)
        const chamadasDuranteAPrimeira = { isAvailable: isAvailable.mock.calls.length, generate: generate.mock.calls.length }
        terminarPrimeira(used(TEXTO_IA))
        await primeira
        await deliver({ ...job, sessionId: "43" })

        expect(chamadasDuranteAPrimeira).toEqual({ isAvailable: 1, generate: 1 })
        expect(sendMessages.mock.calls[0]).toEqual([{ to: segundoJob.phone, messages: mensagensRespostaOficial(resposta) }])
        expect(logger.log.mock.calls).toEqual([
            [JSON.stringify({ event: "llm_answer_fallback", sessionId: segundoJob.sessionId, reason: "LLM_BUSY" })],
        ])
        expect(generate).toHaveBeenCalledTimes(2)
    })

    it.each([
        { caso: "a sondagem falha", opcoes: { available: false } },
        { caso: "o texto tem número diferente", opcoes: { generated: used("Segredo gerado: reclame em até 45 dias.") } },
        { caso: "o texto é longo demais", opcoes: { generated: used(`Segredo gerado em 30 dias ${"a".repeat(1100)}`) } },
        {
            caso: "o gateway recusa a mensagem da IA",
            opcoes: { generated: used("Segredo gerado: reclame em até 30 dias."), sent: [{ ok: false, reason: "REJECTED" }, { ok: true }] as SendMessagesResult[] },
        },
        {
            caso: "tudo falha",
            opcoes: {
                generated: used("Segredo gerado: reclame em até 30 dias."),
                sent: [{ ok: false, reason: "REJECTED" }, { ok: false, reason: "UNREACHABLE" }] as SendMessagesResult[],
            },
        },
    ])("não registra o telefone nem o texto gerado no log quando $caso", async ({ opcoes }) => {
        const { deliver, logger } = setup(opcoes)

        await deliver(job)

        expect(logger.log).toHaveBeenCalledOnce()
        const registrado = JSON.stringify(logger.log.mock.calls)
        expect(registrado).not.toContain(job.phone)
        expect(registrado).not.toContain("Segredo gerado")
    })

    describe("com o cliente do Ollama", () => {
        afterEach(() => {
            vi.useRealTimers()
            vi.unstubAllGlobals()
            vi.unstubAllEnvs()
            vi.restoreAllMocks()
        })

        it("libera a vaga de geração quando a leitura do corpo esgota LLM_TIMEOUT_MS e a entrega seguinte volta a sondar o Ollama", async () => {
            vi.useFakeTimers()
            vi.stubEnv("OLLAMA_URL", "http://ollama-test:11434")
            vi.stubEnv("LLM_TIMEOUT_MS", "50")
            vi.spyOn(console, "error").mockImplementation(() => undefined)
            const fetchMock = vi.fn(async (url: string) =>
                url.endsWith("/api/tags") ? { ok: true, status: 200 } : { ok: true, status: 200, json: () => new Promise(() => {}) },
            )
            vi.stubGlobal("fetch", fetchMock)
            const client = new OllamaLlmClient()
            const isAvailable = vi.spyOn(client, "isAvailable")
            const sendMessages = vi.fn<(input: SendMessagesInput) => Promise<SendMessagesResult>>().mockResolvedValue({ ok: true })
            const logger = { log: vi.fn() }
            const deliver = createLlmAnswerService({
                llm: client,
                generate: createLlmExplicacaoService({ client }),
                gateway: { sendMessages },
                events: { record: vi.fn().mockResolvedValue(undefined) },
                logger,
            })

            const primeira = deliver(job)
            await vi.advanceTimersByTimeAsync(50)
            await primeira
            const segunda = deliver({ ...job, sessionId: "42" })
            await vi.advanceTimersByTimeAsync(50)
            await segunda

            expect(isAvailable).toHaveBeenCalledTimes(2)
            expect(logger.log.mock.calls).toEqual([
                [JSON.stringify({ event: "llm_answer_fallback", sessionId: job.sessionId, reason: "LLM_FAILED" })],
                [JSON.stringify({ event: "llm_answer_fallback", sessionId: "42", reason: "LLM_FAILED" })],
            ])
        })
    })
})
