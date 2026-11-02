import { GatewayClient, gatewayClient } from "../clients/gateway.client"
import { LlmComplementJob, LlmExplicacaoResult } from "../types/llm.types"
import { RespostaFinalOutput } from "../types/motorDecisao.types"
import { ConversationEventService, conversationEventService } from "./conversationEvent.service"
import { gerarExplicacaoLlm } from "./llmExplicacao.service"
import { formatarComplementoIa } from "./messageFormatter.service"

const LIMITE_TEXTO_WHATSAPP = 4096

interface LlmComplementDependencies {
    generate: (resposta: RespostaFinalOutput) => Promise<LlmExplicacaoResult>
    gateway: Pick<GatewayClient, "sendText">
    events: Pick<ConversationEventService, "record">
    logger: Pick<Console, "log">
}

type ComplementFailure = "LLM_FAILED" | "TOO_LONG" | "NOT_CONFIGURED" | "REJECTED" | "UNREACHABLE"

type ComplementOutcome = { llm: "USED" } | { llm: "FAILED"; reason: ComplementFailure }

export function createLlmComplementService({
    generate,
    gateway,
    events,
    logger,
}: LlmComplementDependencies): (job: LlmComplementJob) => Promise<void> {
    async function send(job: LlmComplementJob): Promise<ComplementOutcome> {
        const generated = await generate(job.resposta)
        if (generated.status !== "USED" || generated.explicacaoLlm === null) {
            return { llm: "FAILED", reason: "LLM_FAILED" }
        }
        const text = formatarComplementoIa(generated.explicacaoLlm)
        if (Array.from(text).length > LIMITE_TEXTO_WHATSAPP) {
            return { llm: "FAILED", reason: "TOO_LONG" }
        }
        const result = await gateway.sendText({ to: job.phone, text })
        return result.ok ? { llm: "USED" } : { llm: "FAILED", reason: result.reason }
    }

    return async (job: LlmComplementJob): Promise<void> => {
        const outcome = await send(job)
        if (outcome.llm === "FAILED") {
            logger.log(JSON.stringify({ event: "llm_complement_failed", sessionId: job.sessionId, reason: outcome.reason }))
        }
        await events.record(
            job.sessionId,
            { type: "ANSWER_SENT", categoryId: job.categoryId, questionId: job.questionId, llm: outcome.llm },
            job.answeredAt,
        )
    }
}

export function createBackgroundRunner(
    deliver: (job: LlmComplementJob) => Promise<void>,
    logger: Pick<Console, "log">,
): (job: LlmComplementJob) => void {
    return (job: LlmComplementJob): void => {
        deliver(job).catch(() => {
            logger.log(JSON.stringify({ event: "llm_complement_failed", sessionId: job.sessionId }))
        })
    }
}

export const deliverLlmComplement = createLlmComplementService({
    generate: gerarExplicacaoLlm,
    gateway: gatewayClient,
    events: conversationEventService,
    logger: console,
})
