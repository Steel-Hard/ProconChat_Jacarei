import { RespostaFinalOutput } from "../types/motorDecisao.types"
import { ILlmClient } from "./llm.client.interface"

const PROMPT_INSTRUCTION =
    "Reescreva a resposta abaixo em um parágrafo natural e empático para o cidadão, sem inventar informação nova, sem alterar os fatos, mantendo a base legal citada."

export class LlmTimeoutError extends Error {
    constructor(timeoutMs: number) {
        super(`Ollama não respondeu em ${timeoutMs}ms.`)
        this.name = "LlmTimeoutError"
    }
}

interface OllamaGenerateResponse {
    response?: unknown
}

function montarPrompt(resumo: RespostaFinalOutput): string {
    return `${PROMPT_INSTRUCTION}\n\nDados estruturados:\n${JSON.stringify(resumo, null, 2)}`
}

export class OllamaLlmClient implements ILlmClient {
    private readonly ollamaUrl: string
    private readonly model: string
    private readonly timeoutMs: number

    constructor() {
        this.ollamaUrl = process.env.OLLAMA_URL || "http://ollama:11434"
        this.model = process.env.LLM_MODEL || "llama3.2:3b"
        this.timeoutMs = Number(process.env.LLM_TIMEOUT_MS) || 20000
    }

    async gerarTextoExplicativo(resumo: RespostaFinalOutput): Promise<string> {
        const prompt = montarPrompt(resumo)
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

        let response: Response
        try {
            response = await fetch(`${this.ollamaUrl}/api/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model: this.model, stream: false, prompt }),
                signal: controller.signal,
            })
        } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
                throw new LlmTimeoutError(this.timeoutMs)
            }
            throw error
        } finally {
            clearTimeout(timeout)
        }

        if (!response.ok) {
            throw new Error(`Ollama respondeu com status ${response.status}.`)
        }

        let body: OllamaGenerateResponse
        try {
            body = (await response.json()) as OllamaGenerateResponse
        } catch {
            throw new Error("Resposta do Ollama não é um JSON válido.")
        }

        if (typeof body.response !== "string" || body.response.trim().length === 0) {
            throw new Error("Resposta do Ollama não contém um campo 'response' de texto válido.")
        }

        return body.response
    }
}

export default OllamaLlmClient
