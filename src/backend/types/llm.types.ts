import type { LlmStatus } from "./conversationEvent.types"

export interface LlmExplicacaoResult {
    explicacaoLlm: string | null
    geradoPorLlm: boolean
    status: LlmStatus
}
