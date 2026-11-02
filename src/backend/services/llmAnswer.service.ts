import { GatewayClient, gatewayClient } from "../clients/gateway.client"
import { ILlmClient } from "../clients/llm.client.interface"
import { OllamaLlmClient } from "../clients/ollamaLlm.client"
import { LlmAnswerJob, LlmExplicacaoResult } from "../types/llm.types"
import { OutgoingMessage } from "../types/message.types"
import { RespostaFinalOutput } from "../types/motorDecisao.types"
import { ConversationEventService, conversationEventService } from "./conversationEvent.service"
import { gerarExplicacaoLlm } from "./llmExplicacao.service"
import {
    conferirNumerosIa,
    mensagensRespostaOficial,
    montarMensagemIa,
    normalizarTextoIa,
} from "./messageFormatter.service"

interface LlmAnswerDependencies {
    llm: Pick<ILlmClient, "isAvailable">
    generate: (resposta: RespostaFinalOutput) => Promise<LlmExplicacaoResult>
    gateway: Pick<GatewayClient, "sendMessages">
    events: Pick<ConversationEventService, "record">
    logger: Pick<Console, "log">
}

type FallbackReason =
    | "LLM_BUSY"
    | "LLM_UNAVAILABLE"
    | "LLM_FAILED"
    | "FACTS_MISMATCH"
    | "TOO_LONG"
    | "NOT_CONFIGURED"
    | "REJECTED"
    | "UNREACHABLE"

const LIMITE_CORPO_BOTOES = 1024

const GERACOES_SIMULTANEAS = 1

type AnswerAttempt = { llm: "USED" } | { llm: "FAILED"; reason: FallbackReason }

export function createLlmAnswerService({
    llm,
    generate,
    gateway,
    events,
    logger,
}: LlmAnswerDependencies): (job: LlmAnswerJob) => Promise<void> {
    let generationsInProgress = 0

    async function prepareLlmMessage(job: LlmAnswerJob): Promise<OutgoingMessage | FallbackReason> {
        if (!(await llm.isAvailable())) {
            return "LLM_UNAVAILABLE"
        }
        const generated = await generate(job.resposta)
        if (generated.status !== "USED" || generated.explicacaoLlm === null) {
            return "LLM_FAILED"
        }
        const texto = normalizarTextoIa(generated.explicacaoLlm)
        if (texto === "") {
            return "LLM_FAILED"
        }
        if (!conferirNumerosIa(texto, job.resposta)) {
            return "FACTS_MISMATCH"
        }
        const mensagem = montarMensagemIa(texto, job.resposta)
        if (Array.from(mensagem.text).length > LIMITE_CORPO_BOTOES) {
            return "TOO_LONG"
        }
        return mensagem
    }

    async function tryLlmAnswer(job: LlmAnswerJob): Promise<AnswerAttempt> {
        if (generationsInProgress >= GERACOES_SIMULTANEAS) {
            return { llm: "FAILED", reason: "LLM_BUSY" }
        }
        generationsInProgress += 1
        let prepared: OutgoingMessage | FallbackReason
        try {
            prepared = await prepareLlmMessage(job)
        } finally {
            generationsInProgress -= 1
        }
        if (typeof prepared === "string") {
            return { llm: "FAILED", reason: prepared }
        }
        const sent = await gateway.sendMessages({ to: job.phone, messages: [prepared] })
        return sent.ok ? { llm: "USED" } : { llm: "FAILED", reason: sent.reason }
    }

    return async (job: LlmAnswerJob): Promise<void> => {
        const attempt = await tryLlmAnswer(job)
        if (attempt.llm === "FAILED") {
            const sent = await gateway.sendMessages({ to: job.phone, messages: mensagensRespostaOficial(job.resposta) })
            if (!sent.ok) {
                logger.log(JSON.stringify({ event: "answer_delivery_failed", sessionId: job.sessionId, reason: sent.reason }))
                return
            }
            logger.log(JSON.stringify({ event: "llm_answer_fallback", sessionId: job.sessionId, reason: attempt.reason }))
        }
        await events.record(job.sessionId, {
            type: "ANSWER_SENT",
            categoryId: job.categoryId,
            questionId: job.questionId,
            llm: attempt.llm,
        })
        if (job.resposta.requer_presencial) {
            await events.record(job.sessionId, { type: "SCHEDULE_OFFERED", reason: "REQUIRES_IN_PERSON" })
        }
    }
}

export const deliverLlmAnswer = createLlmAnswerService({
    llm: new OllamaLlmClient(),
    generate: gerarExplicacaoLlm,
    gateway: gatewayClient,
    events: conversationEventService,
    logger: console,
})
