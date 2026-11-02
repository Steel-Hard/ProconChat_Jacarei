import { RespostaFinalOutput } from "../types/motorDecisao.types"

export interface ILlmClient {
    gerarTextoExplicativo(resumo: RespostaFinalOutput): Promise<string>
    isAvailable(): Promise<boolean>
}
