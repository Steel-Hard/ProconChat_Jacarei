import type { LlmStatus } from "./conversationEvent.types"
import type { RespostaFinalOutput } from "./motorDecisao.types"

export interface LlmExplicacaoResult {
    explicacaoLlm: string | null
    geradoPorLlm: boolean
    status: LlmStatus
}

export interface LlmComplementJob {
    phone: string
    sessionId: string
    categoryId: number
    questionId: number
    resposta: RespostaFinalOutput
    answeredAt: Date
}

export interface LlmAnswerJob {
    phone: string
    sessionId: string
    categoryId: number
    questionId: number
    resposta: RespostaFinalOutput
}
