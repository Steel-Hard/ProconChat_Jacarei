import { ILlmClient } from "../clients/llm.client.interface"
import { OllamaLlmClient } from "../clients/ollamaLlm.client"
import { LlmExplicacaoResult } from "../types/llm.types"
import { RespostaFinalOutput } from "../types/motorDecisao.types"

interface LlmExplicacaoDependencies {
    client: ILlmClient
}

export function createLlmExplicacaoService({
    client,
}: LlmExplicacaoDependencies): (resumo: RespostaFinalOutput) => Promise<LlmExplicacaoResult> {
    return async (resumo: RespostaFinalOutput): Promise<LlmExplicacaoResult> => {
        if (resumo.fora_de_escopo) {
            return { explicacaoLlm: null, geradoPorLlm: false }
        }

        try {
            const explicacaoLlm = await client.gerarTextoExplicativo(resumo)
            return { explicacaoLlm, geradoPorLlm: true }
        } catch (error) {
            console.error("Falha ao gerar explicacao via LLM, usando resposta estruturada crua.", error)
            return { explicacaoLlm: null, geradoPorLlm: false }
        }
    }
}

export const gerarExplicacaoLlm = createLlmExplicacaoService({ client: new OllamaLlmClient() })
