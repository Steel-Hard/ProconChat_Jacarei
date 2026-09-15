import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { RespostaFinalOutput } from "../types/motorDecisao.types"
import { OllamaLlmClient } from "./ollamaLlm.client"

const resumo: RespostaFinalOutput = {
    categoria: "Vício/Defeito de Produto ou Serviço",
    pergunta: "Comprei um produto com defeito, o que fazer?",
    base_legal: "Art. 18 do Código de Defesa do Consumidor (Lei 8.078/1990)",
    resposta: "Você tem até 30 dias para reclamar do defeito junto ao fornecedor.",
    documentos_necessarios: ["Nota fiscal"],
    requer_presencial: false,
    fora_de_escopo: false,
}

describe("OllamaLlmClient", () => {
    beforeEach(() => {
        process.env.OLLAMA_URL = "http://ollama-test:11434"
        process.env.LLM_MODEL = "llama3.2:3b"
        process.env.LLM_TIMEOUT_MS = "50"
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        delete process.env.OLLAMA_URL
        delete process.env.LLM_MODEL
        delete process.env.LLM_TIMEOUT_MS
    })

    it("devolve o texto de 'response' em caso de sucesso", async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ response: "Texto explicativo gerado pelo modelo." }),
        })
        vi.stubGlobal("fetch", fetchMock)

        const client = new OllamaLlmClient()
        const texto = await client.gerarTextoExplicativo(resumo)

        expect(texto).toBe("Texto explicativo gerado pelo modelo.")
        expect(fetchMock).toHaveBeenCalledWith(
            "http://ollama-test:11434/api/generate",
            expect.objectContaining({
                method: "POST",
                body: expect.stringContaining("\"model\":\"llama3.2:3b\""),
            })
        )

        const body = JSON.parse(fetchMock.mock.calls[0][1].body)
        expect(body.stream).toBe(false)
        expect(body.prompt).toContain("Dados estruturados:")
        expect(body.prompt).toContain(JSON.stringify(resumo, null, 2))
    })

    it("lança erro em caso de timeout", async () => {
        const fetchMock = vi.fn().mockImplementation(
            (_url: string, init: { signal: AbortSignal }) =>
                new Promise((_resolve, reject) => {
                    init.signal.addEventListener("abort", () => {
                        const abortError = new Error("Aborted")
                        abortError.name = "AbortError"
                        reject(abortError)
                    })
                })
        )
        vi.stubGlobal("fetch", fetchMock)

        const client = new OllamaLlmClient()
        await expect(client.gerarTextoExplicativo(resumo)).rejects.toThrow()
    })

    it("lança erro quando o Ollama responde com status não-200", async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
            json: async () => ({}),
        })
        vi.stubGlobal("fetch", fetchMock)

        const client = new OllamaLlmClient()
        await expect(client.gerarTextoExplicativo(resumo)).rejects.toThrow()
    })

    it("lança erro quando o corpo não tem o campo 'response'", async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ done: true }),
        })
        vi.stubGlobal("fetch", fetchMock)

        const client = new OllamaLlmClient()
        await expect(client.gerarTextoExplicativo(resumo)).rejects.toThrow()
    })

    it("lança erro quando o campo 'response' está vazio", async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ response: "   " }),
        })
        vi.stubGlobal("fetch", fetchMock)

        const client = new OllamaLlmClient()
        await expect(client.gerarTextoExplicativo(resumo)).rejects.toThrow()
    })

    it("propaga erro quando o fetch rejeita (erro de rede)", async () => {
        const fetchMock = vi.fn().mockRejectedValue(new Error("network error"))
        vi.stubGlobal("fetch", fetchMock)

        const client = new OllamaLlmClient()
        await expect(client.gerarTextoExplicativo(resumo)).rejects.toThrow("network error")
    })
})
