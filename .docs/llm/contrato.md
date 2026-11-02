# Contrato de entrada/saída do serviço LLM

Este documento descreve como o Backend conversa com o serviço `ollama` do `compose.yaml`. O cliente HTTP é `src/backend/clients/ollamaLlm.client.ts`, usado pelo serviço `src/backend/services/llmExplicacao.service.ts`. Desde a #66 o fluxo da conversa o chama em segundo plano, pelo job de `src/backend/services/llmComplement.service.ts` ([decisão 009](../decisoes/009-complemento-por-llm.md), item 6; ver "Uso no fluxo da conversa").

## Entrada

O Backend serializa como JSON o mesmo formato de `RespostaFinalOutput` (`src/backend/types/motorDecisao.types.ts`):

```ts
export interface RespostaFinalOutput {
    categoria: string
    pergunta: string
    base_legal: string
    resposta: string
    documentos_necessarios: string[]
    requer_presencial: boolean
    fora_de_escopo: boolean
    proximos_passos?: string
}
```

Esses campos são embutidos dentro de um prompt de instrução fixo (`JSON.stringify` do objeto inteiro, inclusive `proximos_passos` quando existe), enviado a `POST /api/generate` do Ollama (`OLLAMA_URL`, padrão `http://ollama:11434`) com `"stream": false` e o modelo de `LLM_MODEL` (padrão `llama3.2:3b`).

### Exemplo de requisição completa

```json
{
  "model": "llama3.2:3b",
  "stream": false,
  "prompt": "Reescreva a resposta abaixo em um parágrafo natural e empático para o cidadão, sem inventar informação nova, sem alterar os fatos, mantendo a base legal citada.\n\nDados estruturados:\n{\n  \"categoria\": \"Vício/Defeito de Produto ou Serviço\",\n  \"pergunta\": \"Comprei um produto com defeito, o que fazer?\",\n  \"base_legal\": \"Art. 18 do Código de Defesa do Consumidor (Lei 8.078/1990)\",\n  \"resposta\": \"Você tem até 30 dias (produtos não duráveis) ou 90 dias (produtos duráveis) para reclamar do defeito junto ao fornecedor, que tem até 30 dias para saná-lo.\",\n  \"documentos_necessarios\": [\"Nota fiscal\", \"Comprovante de tentativa de contato com o fornecedor\"],\n  \"requer_presencial\": false,\n  \"fora_de_escopo\": false\n}"
}
```

Este exemplo foi realmente executado contra o modelo durante a validação desta spec — ver resultado em `.docs/llm/modelo.md`.

## Saída esperada

O Ollama devolve um JSON com vários campos (`model`, `created_at`, `response`, `done`, métricas de duração, etc.); o único campo relevante para o Backend consumir é `response`: uma **string de texto simples**, sem formatação estruturada adicional, contendo apenas o texto explicativo complementar. O cliente recusa uma resposta sem `response` em texto não vazio.

O LLM **não deve** devolver, alterar ou reprocessar:

- `requer_presencial`
- `fora_de_escopo`
- `documentos_necessarios`

Essas decisões já vieram prontas do Motor de Decisão (RP05/RF05) e continuam sendo usadas como vieram, independente do texto gerado pelo LLM.

## O que este texto NÃO inclui

A string retornada em `response` é **conteúdo bruto do modelo**. Ela não inclui:

- O aviso de caráter não vinculante (RNF04 — a resposta não substitui atendimento formal do PROCON).
- A identificação de que o texto foi gerado com auxílio de um modelo de linguagem (RNF05).

Quem monta a mensagem ao cidadão é o Backend (`formatarComplementoIa`, em `messageFormatter.service.ts`): ele acrescenta o rótulo "Gerado com auxílio de IA". O aviso de caráter não vinculante não é repetido no complemento, porque já vai no fim da resposta oficial.

## Falhas e fallback

**A ausência de resposta do LLM não pode travar o fluxo do chatbot.** O cliente aborta a chamada depois de `LLM_TIMEOUT_MS` (padrão 20000 ms, `LlmTimeoutError`) e lança erro em HTTP de erro, JSON inválido ou `response` vazio; não há nova tentativa. O serviço `llmExplicacao.service.ts` captura qualquer falha e devolve `status: "FAILED"` sem texto, para o Backend usar só a resposta oficial (`RespostaFinalOutput.resposta`). Pergunta fora do escopo não chama o cliente (`status: "NOT_CALLED"`); resposta gerada vem com `status: "USED"`. Esse `status` é o valor de `llm` no evento `ANSWER_SENT`.

## Uso no fluxo da conversa (#66)

1. O cidadão escolhe uma pergunta dentro do escopo com `llm_allowed = true`. O fluxo devolve a resposta oficial na hora, igual a antes, e entrega um job em segundo plano com o telefone, a sessão, a categoria, a pergunta, o `RespostaFinalOutput` e o horário da resposta (`answeredAt`). O job roda fora da trava por telefone, então a próxima mensagem do cidadão não espera por ele.
2. O job chama `gerarExplicacaoLlm`. Com `USED`, monta a mensagem: texto gerado sem espaços nas pontas, uma linha em branco e `Gerado com auxílio de IA` no rodapé, sem o aviso não vinculante e sem itálico. Com até 4096 caracteres, pede o envio ao Gateway (`POST /internal/whatsapp/messages/text`). Acima disso, não envia nem corta.
3. No fim, o job grava **um** `ANSWER_SENT` com `created_at = answeredAt`: `USED` se o Gateway confirmou o envio, ou `FAILED` se o cidadão ficou só com o texto oficial (LLM falhou, mensagem grande demais, Gateway recusou ou não respondeu). Cada `FAILED` gera o log `{ "event": "llm_complement_failed", "sessionId", "reason" }`, com `reason` em `LLM_FAILED`, `TOO_LONG`, `NOT_CONFIGURED`, `REJECTED` ou `UNREACHABLE`. O log nunca leva o telefone nem o texto gerado.
4. Pergunta com `llm_allowed = false` ou fora do escopo não gera job e grava `ANSWER_SENT` com `NOT_CALLED` na hora.
