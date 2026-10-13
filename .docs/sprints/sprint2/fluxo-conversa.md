# Fluxo da conversa e registro de eventos

Este documento resume o fluxo conversacional vigente no backend e a forma de
registrar seus passos. As regras funcionais adotadas estão nas decisões
[008](../../decisoes/008-fluxo-da-conversa-e-desfechos.md) e
[010](../../decisoes/010-registro-de-interacoes-e-relatorios.md).

## Visão rápida

```text
Mensagem recebida
       |
       v
Encontrar ou criar sessão pela identificação HMAC do telefone
       |
       +-- sessão ativa há 30 min ou mais --> ABANDONED (etapa anterior)
       |                                      |
       |                                      v
       |                                Criar sessão nova
       |
       +-- sessão nova ------------------> STARTED (na transação da criação)
       |                                      |
       |                                      v
       |                                Mostrar categorias
       |
       +-- aguardando categoria ----------> Registrar categoria escolhida
       |                                      |
       |                                      v
       |                                Mostrar perguntas da categoria
       |
       +-- aguardando pergunta -----------> Registrar pergunta escolhida
                                              |
                                              v
                                        Obter resposta do catálogo
                                              |
                                              v
                                        Encerrar sessão: ANSWER_SENT + desfecho
                                        na mesma transação
```

## Passos atualmente executados

1. O backend valida o telefone e calcula seu HMAC; o número não é usado como
   identificador em claro para a sessão.
2. O repositório procura uma sessão ativa. Se não houver uma, cria a sessão e
   grava `STARTED` na mesma transação; o fluxo só apresenta as categorias e
   nunca grava `STARTED` de novo na mesma sessão.
3. Enquanto a sessão aguarda categoria, o bot interpreta a entrada como uma
   opção numérica. Uma opção válida produz `CATEGORY_CHOSEN`, atualiza a etapa
   e apresenta as perguntas daquela categoria.
4. Enquanto aguarda pergunta, uma opção válida produz `QUESTION_CHOSEN`. O
   motor obtém a resposta cadastrada.
5. O fluxo encerra a sessão com `ANSWER_SENT` (`llm: "NOT_CALLED"`) como
   evento de fechamento: `OUT_OF_SCOPE` para perguntas fora do escopo e
   `RESOLVED` para as demais. O `RESOLVED` com `ANSWER_SENT` é uma exceção
   provisória, que a #55 remove quando o fluxo passar a perguntar "A dúvida
   foi resolvida?". O evento e o desfecho são gravados na mesma transação.

Entradas inválidas recebem novamente a lista de opções. O texto inválido não
é registrado como evento.

## Eventos e dados permitidos

Os eventos são gravados em `ConversationEvents` com tipo, referências
estruturadas e horário gerado pelo banco. A tabela completa dos 15 tipos, a
chamada de cada passo e a issue responsável estão no
[README do backend](../../../src/backend/README.md#eventos-da-conversa).

| Evento | Colunas | `data` |
|---|---|---|
| `STARTED` | — | `{}` |
| `CATEGORY_CHOSEN` | `category_id` | `{}` |
| `QUESTION_CHOSEN` | `category_id`, `question_id` | `{}` |
| `ANSWER_SENT` | `category_id`, `question_id` | `{ "llm": "NOT_CALLED" \| "USED" \| "FAILED" }` |
| `ATTENDEE_CHOSEN` | — | `{ "by_representative": true \| false }` |
| `APPOINTMENT_RESCHEDULED` | `appointment_id` | `{ "from": "<ISO 8601>", "to": "<ISO 8601>" }` |
| `ABANDONED` | — | `{ "step": "<session_step>" }` |

O estado da IA em `ANSWER_SENT` usa a chave `llm`:

- `NOT_CALLED`: o fluxo respondeu sem chamar IA;
- `USED`: uma resposta contou com IA;
- `FAILED`: a tentativa de uso da IA falhou.

O `llmExplicacao` já devolve esse `status`. O bot atual responde usando o
catálogo e não chama IA; portanto, o valor registrado hoje é `NOT_CALLED`. A
#66 passa a gravar `USED` e `FAILED` quando ligar o LLM ao fluxo.

**Nunca adicionar texto digitado pelo cidadão aos dados do evento, logs de
interação ou desfechos.** Há três barreiras:

1. o validador `buildConversationEventRow` recusa, antes de qualquer consulta,
   tipo desconhecido, chave a mais, id que não é inteiro positivo, valor fora
   das listas fechadas, booleano em texto e data sem fuso, sem repetir o valor
   na mensagem do erro;
2. os `CHECK` da migration `13` (`chk_conversation_events_data_keys` e
   `chk_conversation_events_data_values`) recusam no banco, com `23514`, chave
   ou valor de `data` fora do contrato;
3. um teste de guarda impede `INSERT INTO ConversationEvents` fora dos
   repositórios de eventos e de sessões.

Nome e CPF pertencem ao processo de agendamento, que deve armazená-los
exclusivamente no registro do agendamento e aplicar as proteções definidas
para esses dados. O `draft` da sessão nunca é copiado para `data`.

Falha ao gravar um evento comum não derruba a resposta: o serviço registra no
log só o tipo do evento, o id da sessão e o código do erro, e o cidadão recebe
a resposta. Uma falha no encerramento do fluxo atual também só vai para o log;
a sessão fica em andamento e é abandonada pelo timeout. Já a criação do
agendamento (#56) e a remarcação ou o cancelamento (#59) gravam o evento e o
desfecho na mesma transação da reserva: se algo falhar, tudo volta e o cidadão
é avisado de que o agendamento não foi gravado.

## Sessão, desfecho e abandono

Uma sessão em andamento tem `outcome = IN_PROGRESS`. O encerramento grava o
evento de fechamento e, no mesmo `UPDATE`, `status = FINISHED`, o desfecho,
`ended_at`, `current_step = FINISHED` e `draft = NULL`, só se a sessão ainda
estiver em andamento. O evento de fechamento tem que casar com o desfecho
(decisão 008): `RESOLVED` com `RESOLVED_ANSWERED` (`resolved: true`) ou,
provisoriamente, `ANSWER_SENT`; `SCHEDULED` com `APPOINTMENT_CREATED`;
`OUT_OF_SCOPE` com `ANSWER_SENT`; `NO_SLOT` com `NO_SLOT`; `DECLINED` com
`SCHEDULE_DECLINED`; `MANAGED_APPOINTMENT` com `APPOINTMENT_RESCHEDULED` ou
`APPOINTMENT_CANCELED`.

Se a última interação tiver 30 minutos ou mais, o repositório, na transação
que cria a próxima sessão do mesmo número:

1. seleciona e bloqueia a sessão expirada;
2. muda seu estado e desfecho para `ABANDONED`;
3. copia a etapa corrente para `abandoned_at_step`;
4. limpa o `draft` e grava `ended_at = last_interaction_at + 30 minutos`, sem
   alterar `last_interaction_at`;
5. cria um evento `ABANDONED` com a etapa;
6. cria ou localiza a sessão ativa para a nova mensagem.

A etapa guardada deve ser a etapa que a sessão aguardava antes de expirar, não
`FINISHED`. Isso permite agrupar abandonos por etapa sem salvar a mensagem que
o cidadão enviou. A correspondência entre etapa e os nomes de abandono dos
Relatórios é da #68.

As sessões de quem nunca volta a escrever continuam em andamento até a
varredura periódica da #55, que aplica a mesma regra.

## Eventos previstos para as próximas etapas

O schema e o tipo compartilhado também contemplam eventos de resolução e de
agendamento: `RESOLVED_ANSWERED`, `SCHEDULE_OFFERED`, `NO_SLOT`,
`SCHEDULE_DECLINED`, `ATTENDEE_CHOSEN`, `PHONE_NOTICE_SHOWN`,
`APPOINTMENT_CREATED`, `APPOINTMENT_CONSULTED`, `APPOINTMENT_RESCHEDULED` e
`APPOINTMENT_CANCELED`.

Esses eventos só devem ser emitidos quando os respectivos passos estiverem
ligados ao fluxo (#55, #56 e #59), pelas chamadas descritas no README do
backend. A máquina atual ainda não implementa a pergunta “A dúvida
foi resolvida?” nem a conversa de agendamento; não se deve inferir esses
eventos a partir do texto livre ou gravá-los antecipadamente.

## Indicadores derivados

- Categorias e perguntas mais acessadas contam conversas distintas por item;
  uma repetição na mesma sessão não conta novamente.
- “Resolvidas sem agendamento” depende da resposta afirmativa ao evento
  `RESOLVED_ANSWERED`, não apenas de uma sessão terminada.
- Relatórios de resultado de agendamento usam a data do atendimento.
- A taxa de não comparecimento é `Não compareceu / (Atendido + Não compareceu)`.

## Código relacionado

- Fluxo e validação das opções: `src/backend/services/conversationFlow.service.ts`
- Contrato e gravação de eventos: `src/backend/types/conversationEvent.types.ts`,
  `src/backend/utils/conversationEventData.ts`,
  `src/backend/services/conversationEvent.service.ts` e
  `src/backend/repositories/conversationEvent.repository.ts`
- Sessões, desfechos e timeout: `src/backend/repositories/session.repository.ts`
- Schema de eventos e sessões: `src/backend/db/migrations/11_sprint2_schema.sql`
  e `src/backend/db/migrations/13_conversation_events_data_checks.sql`
