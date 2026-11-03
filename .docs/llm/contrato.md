# Contrato de entrada/saída do serviço LLM

Este documento descreve como o Backend conversa com o serviço `ollama` do `compose.yaml`. O cliente HTTP é `src/backend/clients/ollamaLlm.client.ts`, usado pelo serviço `src/backend/services/llmExplicacao.service.ts`. O fluxo da conversa o chama em segundo plano, pela entrega de `src/backend/services/llmAnswer.service.ts`, que usa a resposta escrita pela IA no lugar da explicação oficial ([decisão 009](../decisoes/009-complemento-por-llm.md); ver "Uso no fluxo da conversa").

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

Esses campos são embutidos dentro de um prompt de instrução fixo (`JSON.stringify` do objeto inteiro, inclusive `proximos_passos` quando existe), enviado a `POST /api/generate` do Ollama (`OLLAMA_URL`, padrão `http://ollama:11434`) com `"stream": false`, o modelo de `LLM_MODEL` (padrão `llama3.2:3b`) e `"options": { "num_predict": 300 }`, que limita a saída a 300 tokens.

### Exemplo de requisição completa

```json
{
  "model": "llama3.2:3b",
  "stream": false,
  "prompt": "Reescreva o campo \"resposta\" dos dados abaixo para o cidadão, em português do Brasil, num tom de conversa de WhatsApp, falando diretamente com a pessoa em segunda pessoa (\"você\") e sem usar \"ele\", \"o consumidor\" ou \"o cliente\", de forma clara e organizada: use parágrafos curtos separados por uma linha em branco e, quando houver vários itens, uma lista com um item por linha começando com \"- \". Não invente informação, não altere fatos, prazos, valores nem números e não use números que não estejam nos dados. Não escreva base legal, documentos, próximos passos, saudação, despedida, avisos nem perguntas, porque eles são acrescentados depois. Mantenha as condições e ressalvas da resposta original, como \"em casos específicos\" e \"em geral\": não transforme uma regra geral em uma garantia para a situação da pessoa. Responda só com o texto reescrito.\n\nDados estruturados:\n{\n  \"categoria\": \"Vício/Defeito de Produto ou Serviço\",\n  \"pergunta\": \"Comprei um produto com defeito, o que fazer?\",\n  \"base_legal\": \"Art. 18 do Código de Defesa do Consumidor (Lei 8.078/1990)\",\n  \"resposta\": \"Você tem até 30 dias (produtos não duráveis) ou 90 dias (produtos duráveis) para reclamar do defeito junto ao fornecedor, que tem até 30 dias para saná-lo.\",\n  \"documentos_necessarios\": [\"Nota fiscal\", \"Comprovante de tentativa de contato com o fornecedor\"],\n  \"requer_presencial\": false,\n  \"fora_de_escopo\": false\n}",
  "options": { "num_predict": 300 }
}
```

O tom de conversa em segunda pessoa e a regra de manter as condições e ressalvas entraram porque o catálogo usa frases impessoais e, sem essa instrução, o modelo respondia na terceira pessoa ("Ele não precisa pagar a multa") e podia transformar uma regra geral em garantia para o caso da pessoa. Em 3 execuções no Ollama local com a pergunta "Multa no cancelamento" (Contratos), o prompt atual respondeu sempre em segunda pessoa e manteve a ressalva "em casos específicos"; o prompt anterior não respondeu em segunda pessoa em nenhuma. O resultado medido com o primeiro prompt ("um parágrafo natural e empático") está em `.docs/llm/modelo.md`. A conferência final do texto fica para a verificação manual no WhatsApp.

## Saída esperada

O Ollama devolve um JSON com vários campos (`model`, `created_at`, `response`, `done`, métricas de duração, etc.); o único campo relevante para o Backend consumir é `response`: uma **string de texto simples**, sem formatação estruturada adicional, contendo apenas a explicação reescrita. O cliente recusa uma resposta sem `response` em texto não vazio e recusa `done_reason` diferente de `"stop"` (texto cortado pelo `num_predict`); sem `done_reason` (versões antigas do Ollama), aceita.

O LLM **não deve** devolver, alterar ou reprocessar:

- `requer_presencial`
- `fora_de_escopo`
- `documentos_necessarios`

Essas decisões já vieram prontas do Motor de Decisão (RP05/RF05) e continuam sendo usadas como vieram, independente do texto gerado pelo LLM.

## O que este texto NÃO inclui

A string retornada em `response` é **conteúdo bruto do modelo**. Ela não inclui:

- O aviso de caráter não vinculante (RNF04 — a resposta não substitui atendimento formal do PROCON).
- A identificação de que o texto foi gerado com auxílio de um modelo de linguagem (RNF05).

Quem monta a mensagem ao cidadão é o Backend (`messageFormatter.service.ts`):

- `normalizarTextoIa`: troca `\r\n` por `\n`, tira espaços no fim das linhas, remove `#` de título, troca `**x**` por `*x*`, troca marcadores de lista (`- `, `* `, `• `, `1. `, `1) `) por `• `, remove linhas iguais ao rótulo ou ao aviso, reduz 3 ou mais quebras a 2 e tira as pontas. Um bloco único com mais de 2 frases é separado em parágrafos de até 2 frases.
- `conferirNumerosIa`: compara os conjuntos de sequências de dígitos. O texto precisa ter todos os números do campo `resposta` e nenhum número que não esteja em algum campo dos dados (marcadores de lista numerada não contam). Número por extenso conta como ausente.
- `montarMensagemIa`: mensagem de botões com o corpo `[texto da IA, base legal e documentos, "O que fazer agora", linha de atendimento presencial se houver, aviso não vinculante, pergunta do passo seguinte]`, os botões Sim/Não (ou Agendar presencial/Agora não) e o rodapé "Gerado com auxílio de IA". O corpo vai até 1024 caracteres (limite da Meta para botões).
- `mensagensRespostaOficial`: as duas mensagens oficiais de sempre (texto oficial completo e a pergunta com botões), usadas quando a IA não pode ser usada.

## Falhas e fallback

**A ausência de resposta do LLM não pode travar o fluxo do chatbot.** O cliente aborta a chamada depois de `LLM_TIMEOUT_MS` (padrão 20000 ms, `LlmTimeoutError`) e lança erro em HTTP de erro, JSON inválido ou `response` vazio; não há nova tentativa. `isAvailable()` sonda o Ollama com `GET <OLLAMA_URL>/api/tags` e tempo limite fixo de 2000 ms, e devolve `false` sem lançar em erro de rede, tempo esgotado ou resposta que não é 2xx. O serviço `llmExplicacao.service.ts` captura qualquer falha e devolve `status: "FAILED"` sem texto, para o Backend usar só a resposta oficial (`RespostaFinalOutput.resposta`). Pergunta fora do escopo não chama o cliente (`status: "NOT_CALLED"`); resposta gerada vem com `status: "USED"`. Esse `status` é o valor de `llm` no evento `ANSWER_SENT`.

## Uso no fluxo da conversa

1. O cidadão escolhe uma pergunta dentro do escopo com `llm_allowed = true`. O fluxo grava `QUESTION_CHOSEN`, muda o passo (`AWAITING_RESOLVED` ou, se presencial, `AWAITING_SCHEDULE_OFFER`), marca a sessão como **resposta pendente** (em memória), dispara a entrega em segundo plano sem esperar e devolve `reply = { text: "", step, messages: [], typing: true }`. O Gateway mostra "digitando…" na conversa.
2. A entrega (`llmAnswer.service.ts`), fora da trava por telefone: se já houver uma geração em andamento no processo, manda a oficial na hora (`LLM_BUSY`); senão sonda o Ollama (`LLM_UNAVAILABLE`), gera (`LLM_FAILED` se falhar ou o texto normalizado ficar vazio), confere os números (`FACTS_MISMATCH`), monta a mensagem (`TOO_LONG` acima de 1024) e pede o envio ao Gateway em `POST /internal/whatsapp/messages`. Envio da IA recusado: manda a oficial (`NOT_CONFIGURED`, `REJECTED` ou `UNREACHABLE`).
3. `ANSWER_SENT` é gravado na hora real do envio: `USED` se a mensagem da IA saiu, `FAILED` se saíram as oficiais (log `{ "event": "llm_answer_fallback", "sessionId", "reason" }`). Se nem as oficiais saem, nada é gravado (log `answer_delivery_failed`). Pergunta presencial grava `SCHEDULE_OFFERED REQUIRES_IN_PERSON` logo depois do `ANSWER_SENT`.
4. Enquanto a resposta está pendente (até `2000 + LLM_TIMEOUT_MS + 2 × 15000` ms), uma nova mensagem da sessão recebe só o `typing: true` de novo e não muda o passo. Se o backend reiniciou ou a entrega não gravou `ANSWER_SENT`, a próxima mensagem em `AWAITING_RESOLVED` ou `AWAITING_SCHEDULE_OFFER` recebe as mensagens oficiais, grava `ANSWER_SENT FAILED` (e `SCHEDULE_OFFERED` se presencial) e loga `answer_recovered`.
5. Pergunta com `llm_allowed = false` ou fora do escopo não chama a entrega e grava `ANSWER_SENT` com `NOT_CALLED` na hora, como antes.

Nenhum log leva o telefone, o `wamid` nem o texto gerado.
