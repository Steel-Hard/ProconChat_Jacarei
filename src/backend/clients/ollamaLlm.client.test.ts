import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { RespostaFinalOutput } from "../types/motorDecisao.types"
import { LlmTimeoutError, OllamaLlmClient } from "./ollamaLlm.client"

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
        vi.useRealTimers()
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

        const body = JSON.parse(fetchMock.mock.calls[0]?.[1].body)
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

    it("envia o prompt novo, sem streaming e com o limite de 300 tokens de saída", async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ response: "Texto reescrito.", done_reason: "stop" }),
        })
        vi.stubGlobal("fetch", fetchMock)

        await new OllamaLlmClient().gerarTextoExplicativo(resumo)

        expect(JSON.parse(fetchMock.mock.calls[0]?.[1].body)).toEqual({
            model: "llama3.2:3b",
            stream: false,
            prompt:
                "Reescreva o campo \"resposta\" dos dados abaixo para o cidadão, em português do Brasil, num tom de conversa de WhatsApp, falando diretamente com a pessoa em segunda pessoa (\"você\") e sem chamar a pessoa de \"ele\", \"o consumidor\" ou \"o cliente\", de forma clara e organizada: use parágrafos curtos separados por uma linha em branco e, quando houver vários itens, uma lista com um item por linha começando com \"- \". Não invente informação, não altere fatos, prazos, valores nem números e não use números que não estejam nos dados. Não escreva base legal, documentos, próximos passos, saudação, despedida, avisos nem perguntas, porque eles são acrescentados depois. Mantenha as condições e ressalvas da resposta original, como \"em casos específicos\" e \"em geral\": não transforme uma regra geral em uma garantia para a situação da pessoa. Frases sobre o fornecedor ou sobre outras pessoas continuam falando deles, sem passar a obrigação para a pessoa. Responda só com o texto reescrito." +
                `\n\nDados estruturados:\n${JSON.stringify(resumo, null, 2)}`,
            options: { num_predict: 300 },
        })
    })

    it("pede ao modelo tom de conversa em segunda pessoa e que mantenha as condições e ressalvas", async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ response: "Texto reescrito.", done_reason: "stop" }),
        })
        vi.stubGlobal("fetch", fetchMock)

        await new OllamaLlmClient().gerarTextoExplicativo(resumo)

        const { prompt } = JSON.parse(fetchMock.mock.calls[0]?.[1].body)
        expect(prompt).toContain(
            "num tom de conversa de WhatsApp, falando diretamente com a pessoa em segunda pessoa (\"você\") e sem chamar a pessoa de \"ele\", \"o consumidor\" ou \"o cliente\",",
        )
        expect(prompt).toContain(
            "Mantenha as condições e ressalvas da resposta original, como \"em casos específicos\" e \"em geral\": não transforme uma regra geral em uma garantia para a situação da pessoa. Frases sobre o fornecedor ou sobre outras pessoas continuam falando deles, sem passar a obrigação para a pessoa.",
        )
    })

    it("lança erro sem o texto gerado quando o Ollama corta a saída (done_reason length)", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                json: async () => ({ response: "Texto cortado no meio", done_reason: "length" }),
            }),
        )

        const resultado = new OllamaLlmClient().gerarTextoExplicativo(resumo)

        await expect(resultado).rejects.toThrow("Ollama cortou a resposta (done_reason length).")
        await expect(resultado).rejects.not.toThrow("Texto cortado no meio")
    })

    it.each([
        { label: "com done_reason stop", body: { response: "Texto completo.", done_reason: "stop" } },
        { label: "sem done_reason", body: { response: "Texto completo." } },
    ])("devolve o texto $label", async ({ body }) => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body }))

        const texto = await new OllamaLlmClient().gerarTextoExplicativo(resumo)

        expect(texto).toBe("Texto completo.")
    })

    it("lança LlmTimeoutError em LLM_TIMEOUT_MS quando a leitura do corpo não termina", async () => {
        vi.useFakeTimers()
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => new Promise(() => {}) }))
        let erro: unknown

        const pendente = new OllamaLlmClient().gerarTextoExplicativo(resumo).catch((causa: unknown) => {
            erro = causa
        })
        await vi.advanceTimersByTimeAsync(49)
        const antesDoLimite = erro
        await vi.advanceTimersByTimeAsync(1)
        await pendente

        expect(antesDoLimite).toBeUndefined()
        expect(erro).toBeInstanceOf(LlmTimeoutError)
    })
})


describe("OllamaLlmClient: isAvailable", () => {
    beforeEach(() => {
        process.env.OLLAMA_URL = "http://ollama-test:11434"
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.unstubAllGlobals()
        delete process.env.OLLAMA_URL
    })

    it("consulta GET /api/tags e devolve true quando o Ollama responde 200", async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 })
        vi.stubGlobal("fetch", fetchMock)

        const disponivel = await new OllamaLlmClient().isAvailable()

        expect(disponivel).toBe(true)
        expect(fetchMock).toHaveBeenCalledOnce()
        expect(fetchMock.mock.calls[0]?.[0]).toBe("http://ollama-test:11434/api/tags")
        expect(fetchMock.mock.calls[0]?.[1]).toEqual(expect.objectContaining({ method: "GET" }))
    })

    it.each([
        { label: "o Ollama responde 404", fetchMock: () => vi.fn().mockResolvedValue({ ok: false, status: 404 }) },
        { label: "a chamada é rejeitada", fetchMock: () => vi.fn().mockRejectedValue(new TypeError("fetch failed")) },
    ])("devolve false sem lançar quando $label", async ({ fetchMock }) => {
        vi.stubGlobal("fetch", fetchMock())

        const disponivel = await new OllamaLlmClient().isAvailable()

        expect(disponivel).toBe(false)
    })

    it("devolve false quando o Ollama não responde em 2000 ms e ainda espera até 1999 ms", async () => {
        vi.useFakeTimers()
        const fetchMock = vi.fn(
            (_url: string, init: { signal: AbortSignal }) =>
                new Promise((_resolve, reject) => {
                    init.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")))
                }),
        )
        vi.stubGlobal("fetch", fetchMock)
        let resultado: boolean | undefined

        const pendente = new OllamaLlmClient().isAvailable().then((valor) => {
            resultado = valor
        })
        await vi.advanceTimersByTimeAsync(1999)
        const antesDoLimite = resultado
        await vi.advanceTimersByTimeAsync(1)
        await pendente

        expect(antesDoLimite).toBeUndefined()
        expect(resultado).toBe(false)
    })
})
