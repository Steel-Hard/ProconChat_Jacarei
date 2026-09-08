import { RespostaFinalOutput } from "../types/motorDecisao.types"
import { ILlmClient } from "./llm.client.interface"

export class MockLlmClient implements ILlmClient {
    private nextResult: { texto: string } | { erro: Error } = { texto: "Texto explicativo de exemplo." }

    resolverProximaChamadaCom(texto: string): void {
        this.nextResult = { texto }
    }

    lancarNaProximaChamada(erro: Error): void {
        this.nextResult = { erro }
    }

    async gerarTextoExplicativo(_resumo: RespostaFinalOutput): Promise<string> {
        if ("erro" in this.nextResult) {
            throw this.nextResult.erro
        }
        return this.nextResult.texto
    }
}
