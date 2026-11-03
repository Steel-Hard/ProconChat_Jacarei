import { RespostaFinalOutput } from "../types/motorDecisao.types"
import { ILlmClient } from "./llm.client.interface"

const PROMPT_INSTRUCTION =
    "Reescreva o campo \"resposta\" dos dados abaixo para o cidadão, em português do Brasil, num tom de conversa de WhatsApp, falando diretamente com a pessoa em segunda pessoa (\"você\") e sem usar \"ele\", \"o consumidor\" ou \"o cliente\", de forma clara e organizada: use parágrafos curtos separados por uma linha em branco e, quando houver vários itens, uma lista com um item por linha começando com \"- \". Não invente informação, não altere fatos, prazos, valores nem números e não use números que não estejam nos dados. Não escreva base legal, documentos, próximos passos, saudação, despedida, avisos nem perguntas, porque eles são acrescentados depois. Mantenha as condições e ressalvas da resposta original, como \"em casos específicos\" e \"em geral\": não transforme uma regra geral em uma garantia para a situação da pessoa. Responda só com o texto reescrito."

const NUM_PREDICT = 300

export const LLM_PROBE_TIMEOUT_MS = 2000

export function llmTimeoutMs(): number {
    return Number(process.env.LLM_TIMEOUT_MS) || 20000
}

export class LlmTimeoutError extends Error {
    constructor(timeoutMs: number) {
        super(`Ollama não respondeu em ${timeoutMs}ms.`)
        this.name = "LlmTimeoutError"
    }
}

interface OllamaGenerateResponse {
    response?: unknown
    done_reason?: unknown
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
        this.timeoutMs = llmTimeoutMs()
    }

    async isAvailable(): Promise<boolean> {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), LLM_PROBE_TIMEOUT_MS)
        try {
            const response = await fetch(`${this.ollamaUrl}/api/tags`, { method: "GET", signal: controller.signal })
            return response.ok
        } catch {
            return false
        } finally {
            clearTimeout(timeout)
        }
    }

    private async requestGeneration(prompt: string, signal: AbortSignal): Promise<OllamaGenerateResponse> {
        let response: Response
        try {
            response = await fetch(`${this.ollamaUrl}/api/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ model: this.model, stream: false, prompt, options: { num_predict: NUM_PREDICT } }),
                signal,
            })
        } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
                throw new LlmTimeoutError(this.timeoutMs)
            }
            throw error
        }

        if (!response.ok) {
            throw new Error(`Ollama respondeu com status ${response.status}.`)
        }

        const aborted = new Promise<never>((_resolve, reject) => {
            signal.addEventListener("abort", () => reject(new LlmTimeoutError(this.timeoutMs)), { once: true })
        })
        try {
            return (await Promise.race([response.json(), aborted])) as OllamaGenerateResponse
        } catch {
            if (signal.aborted) {
                throw new LlmTimeoutError(this.timeoutMs)
            }
            throw new Error("Resposta do Ollama não é um JSON válido.")
        }
    }

    async gerarTextoExplicativo(resumo: RespostaFinalOutput): Promise<string> {
        const prompt = montarPrompt(resumo)
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

        let body: OllamaGenerateResponse
        try {
            body = await this.requestGeneration(prompt, controller.signal)
        } finally {
            clearTimeout(timeout)
        }

        if (typeof body.response !== "string" || body.response.trim().length === 0) {
            throw new Error("Resposta do Ollama não contém um campo 'response' de texto válido.")
        }

        if (body.done_reason !== undefined && body.done_reason !== "stop") {
            throw new Error(`Ollama cortou a resposta (done_reason ${String(body.done_reason)}).`)
        }

        return body.response
    }
}

export default OllamaLlmClient
