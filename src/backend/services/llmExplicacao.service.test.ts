import { describe, expect, it, vi } from "vitest"
import { ILlmClient } from "../clients/llm.client.interface"
import { RespostaFinalOutput } from "../types/motorDecisao.types"
import { createLlmExplicacaoService } from "./llmExplicacao.service"

const resumoBase: RespostaFinalOutput = {
    categoria: "Vício/Defeito de Produto ou Serviço",
    pergunta: "Comprei um produto com defeito, o que fazer?",
    base_legal: "Art. 18 do CDC",
    resposta: "Procure a assistência técnica autorizada.",
    documentos_necessarios: ["Nota fiscal"],
    requer_presencial: false,
    fora_de_escopo: false,
}

function criarClientMock(): ILlmClient {
    return { gerarTextoExplicativo: vi.fn() }
}

describe("llmExplicacaoService", () => {
    it("devolve explicacaoLlm e geradoPorLlm: true no caminho feliz", async () => {
        const client = criarClientMock()
        vi.mocked(client.gerarTextoExplicativo).mockResolvedValueOnce("Texto explicativo gerado.")

        const gerarExplicacaoLlm = createLlmExplicacaoService({ client })
        const resultado = await gerarExplicacaoLlm(resumoBase)

        expect(resultado).toEqual({ explicacaoLlm: "Texto explicativo gerado.", geradoPorLlm: true })
    })

    it("devolve fallback sem lançar quando o cliente lança timeout", async () => {
        const client = criarClientMock()
        vi.mocked(client.gerarTextoExplicativo).mockRejectedValueOnce(new Error("timeout"))

        const gerarExplicacaoLlm = createLlmExplicacaoService({ client })
        await expect(gerarExplicacaoLlm(resumoBase)).resolves.toEqual({
            explicacaoLlm: null,
            geradoPorLlm: false,
        })
    })

    it("devolve fallback sem lançar quando o cliente lança HTTP não-200", async () => {
        const client = criarClientMock()
        vi.mocked(client.gerarTextoExplicativo).mockRejectedValueOnce(
            new Error("Ollama respondeu com status 500.")
        )

        const gerarExplicacaoLlm = createLlmExplicacaoService({ client })
        await expect(gerarExplicacaoLlm(resumoBase)).resolves.toEqual({
            explicacaoLlm: null,
            geradoPorLlm: false,
        })
    })

    it("devolve fallback sem lançar quando o cliente lança por corpo malformado", async () => {
        const client = criarClientMock()
        vi.mocked(client.gerarTextoExplicativo).mockRejectedValueOnce(
            new Error("Resposta do Ollama não contém um campo 'response' de texto válido.")
        )

        const gerarExplicacaoLlm = createLlmExplicacaoService({ client })
        await expect(gerarExplicacaoLlm(resumoBase)).resolves.toEqual({
            explicacaoLlm: null,
            geradoPorLlm: false,
        })
    })

    it("devolve fallback sem lançar quando o cliente lança erro de rede", async () => {
        const client = criarClientMock()
        vi.mocked(client.gerarTextoExplicativo).mockRejectedValueOnce(new Error("network error"))

        const gerarExplicacaoLlm = createLlmExplicacaoService({ client })
        await expect(gerarExplicacaoLlm(resumoBase)).resolves.toEqual({
            explicacaoLlm: null,
            geradoPorLlm: false,
        })
    })

    it("nao chama o cliente quando fora_de_escopo e true", async () => {
        const client = criarClientMock()
        const resumoForaDeEscopo: RespostaFinalOutput = { ...resumoBase, fora_de_escopo: true }

        const gerarExplicacaoLlm = createLlmExplicacaoService({ client })
        const resultado = await gerarExplicacaoLlm(resumoForaDeEscopo)

        expect(resultado).toEqual({ explicacaoLlm: null, geradoPorLlm: false })
        expect(client.gerarTextoExplicativo).not.toHaveBeenCalled()
    })
})
