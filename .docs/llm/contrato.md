# Contrato de entrada/saída do serviço LLM

Este documento descreve, para quem for implementar a integração real (issue #15, Integração Backend ↔ LLM Service), como o Backend deve conversar com o serviço `ollama` deste `compose.yaml`. Não implementa o cliente HTTP — só documenta o contrato.

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
}
```

Esses campos são embutidos dentro de um prompt de instrução fixo, enviado a `POST /api/generate` do Ollama (`http://ollama:11434/api/generate` na rede interna do compose) com `"stream": false`.

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

O Ollama devolve um JSON com vários campos (`model`, `created_at`, `response`, `done`, métricas de duração, etc.); o único campo relevante para o Backend consumir é `response`: uma **string de texto simples**, sem formatação estruturada adicional, contendo apenas o texto explicativo complementar.

O LLM **não deve** devolver, alterar ou reprocessar:

- `requer_presencial`
- `fora_de_escopo`
- `documentos_necessarios`

Essas decisões já vieram prontas do Motor de Decisão (RP05/RF05) e continuam sendo usadas como vieram, independente do texto gerado pelo LLM.

## O que este texto NÃO inclui

A string retornada em `response` é **conteúdo bruto do modelo**. Ela não inclui:

- O aviso de caráter não vinculante (RNF04 — a resposta não substitui atendimento formal do PROCON).
- A identificação de que o texto foi gerado com auxílio de um modelo de linguagem (RNF05).

Anexar esses dois elementos à mensagem final é responsabilidade de quem monta a mensagem final ao usuário (Backend, na #15, em conjunto com a #17 "Avisos obrigatórios no fluxo") — não deste serviço.

## Falhas e fallback

O tratamento de falha/timeout do cliente HTTP (retry, timeout configurável, etc.) é implementação da #15, fora do escopo desta spec. O contrato relevante aqui é: **a ausência de resposta do LLM não pode travar o fluxo do chatbot**. O Motor de Decisão já produz, em `RespostaFinalOutput.resposta`, uma resposta estruturada e utilizável por si só — o cliente da #15 deve usar esse campo como fallback caso o LLM falhe, esteja indisponível, ou demore além de um limite aceitável.
