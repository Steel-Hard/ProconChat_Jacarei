# Fluxo da conversa e registro de eventos

Este documento resume o fluxo conversacional vigente no backend e a forma de
registrar seus passos. As regras funcionais adotadas estão nas decisões
[008](../../decisoes/008-fluxo-da-conversa-e-desfechos.md) e
[010](../../decisoes/010-registro-de-interacoes-e-relatorios.md).

## Visão rápida

Retrato do fluxo em 19/10/2026, depois das issues #16, #55 e #56 e da reorganização do bot nos PRs #111 e #112. A volta de
quem já tem agendamento (remarcar e cancelar) é da #59 e ainda não existe.

```text
Mensagem recebida
       |
       +-- respostas automáticas pausadas --> mensagem fixa de pausa (sem sessão)
       |
       v
Encontrar ou criar sessão pela identificação HMAC do telefone
       |
       +-- sessão ativa há 30 min ou mais --> ABANDONED (etapa anterior) e sessão nova
       |
       +-- sessão nova ----------------------> STARTED e lista de categorias
       |
       +-- aguardando categoria -------------> CATEGORY_CHOSEN e lista de perguntas
       |
       +-- aguardando pergunta --------------> QUESTION_CHOSEN e resposta do catálogo
                |
                +-- fora do escopo ----------> ANSWER_SENT + desfecho OUT_OF_SCOPE
                |
                +-- exige presencial --------> ANSWER_SENT, SCHEDULE_OFFERED (REQUIRES_IN_PERSON)
                |                              e oferta de agendamento
                |
                +-- pergunta comum ----------> ANSWER_SENT e "A dúvida foi resolvida?"
                         |
                         +-- Sim ------------> RESOLVED_ANSWERED (true) + desfecho RESOLVED
                         |
                         +-- Não ------------> RESOLVED_ANSWERED (false), SCHEDULE_OFFERED
                                               (NOT_RESOLVED) e oferta de agendamento

Oferta de agendamento
       |
       +-- Agora não ------------------------> SCHEDULE_DECLINED + desfecho DECLINED
       |
       +-- Agendar --------------------------> quem vai comparecer
                |
                v
         ATTENDEE_CHOSEN --> nome do titular --> CPF do titular
                |
                +-- sem horário livre na janela --> NO_SLOT + desfecho NO_SLOT
                |
                +-- lista de horários livres --> horário escolhido
                         |
                         +-- reserva gravada --> PHONE_NOTICE_SHOWN, APPOINTMENT_CREATED
                         |                       + desfecho SCHEDULED, na transação da reserva
                         |
                         +-- horário lotou e não sobrou nenhum --> NO_SLOT + desfecho NO_SLOT
```

## Passos atualmente executados

1. Se as respostas automáticas estiverem pausadas na tela de WhatsApp, o bot
   responde só a mensagem fixa de pausa e não abre nem altera sessão.
2. O backend valida o telefone e calcula seu HMAC; o número não é usado como
   identificador em claro para a sessão. As mensagens do mesmo telefone são
   processadas uma por vez.
3. O repositório procura uma sessão ativa. Se não houver uma, cria a sessão e
   grava `STARTED` na mesma transação, e o bot mostra as categorias.
4. Enquanto a sessão aguarda categoria ou pergunta, o bot aceita a opção da
   lista interativa ou o número da opção. Listas com mais de 10 itens são
   paginadas. Uma opção válida produz `CATEGORY_CHOSEN` ou `QUESTION_CHOSEN`.
5. Com a pergunta escolhida, o motor obtém a resposta cadastrada, sempre
   seguida do aviso de caráter não vinculante:
   - fora do escopo: encerra com `ANSWER_SENT` e desfecho `OUT_OF_SCOPE`;
   - exige atendimento presencial: grava `ANSWER_SENT` e
     `SCHEDULE_OFFERED` (`REQUIRES_IN_PERSON`) e oferece o agendamento;
   - demais perguntas: grava `ANSWER_SENT` e pergunta "A dúvida foi
     resolvida?". "Sim" encerra com `RESOLVED_ANSWERED` (`resolved: true`) e
     desfecho `RESOLVED`; "Não" grava `RESOLVED_ANSWERED` (`resolved: false`)
     e `SCHEDULE_OFFERED` (`NOT_RESOLVED`) e oferece o agendamento.
6. Na oferta, "Agora não" encerra com `SCHEDULE_DECLINED` e desfecho
   `DECLINED`. "Agendar" pergunta quem vai comparecer e grava
   `ATTENDEE_CHOSEN`.
7. O bot pede o nome e o CPF do titular. Eles ficam no `draft` da sessão (o
   CPF só como hash e versão mascarada) até a reserva, e o `draft` é apagado
   quando a sessão termina.
8. Sem horário livre na janela, encerra com `NO_SLOT`. Com horários, mostra a
   lista; o horário escolhido é reservado e, na mesma transação, o sistema
   grava `PHONE_NOTICE_SHOWN`, `APPOINTMENT_CREATED` e o desfecho `SCHEDULED`.
   O cidadão recebe a confirmação "Agendamento realizado" com protocolo,
   endereço e documentos.

Entradas inválidas recebem novamente as opções da etapa. O texto inválido não
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
é avisado de que o agendamento não foi gravado. A criação do agendamento já
funciona; a remarcação e o cancelamento ainda não.

## Sessão, desfecho e abandono

Uma sessão em andamento tem `outcome = IN_PROGRESS`. O encerramento grava o
evento de fechamento e, no mesmo `UPDATE`, `status = FINISHED`, o desfecho,
`ended_at`, `current_step = FINISHED` e `draft = NULL`, só se a sessão ainda
estiver em andamento. O evento de fechamento tem que casar com o desfecho
(decisão 008): `RESOLVED` com `RESOLVED_ANSWERED` (`resolved: true`);
`SCHEDULED` com `APPOINTMENT_CREATED`;
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

As sessões de quem nunca volta a escrever são encerradas pela varredura
periódica, que roda a cada minuto e aplica a mesma regra.

## Eventos previstos para as próximas etapas

Os eventos de resolução e de agendamento novo já são emitidos pelo fluxo
(`RESOLVED_ANSWERED`, `SCHEDULE_OFFERED`, `SCHEDULE_DECLINED`, `NO_SLOT`,
`ATTENDEE_CHOSEN`, `PHONE_NOTICE_SHOWN` e `APPOINTMENT_CREATED`).

Ainda faltam:

- `APPOINTMENT_CONSULTED`, `APPOINTMENT_RESCHEDULED` e `APPOINTMENT_CANCELED`,
  com o desfecho `MANAGED_APPOINTMENT`: dependem da conversa de retorno de
  quem já tem agendamento (#59). As etapas `AWAITING_RETURN_CHOICE` e
  `AWAITING_CANCEL_CONFIRMATION` já existem no schema, mas o fluxo ainda não
  as usa;
- `llm: "USED"` e `llm: "FAILED"` em `ANSWER_SENT`: dependem do complemento
  por IA no fluxo (#66).

Esses eventos só devem ser emitidos quando os respectivos passos estiverem
ligados ao fluxo, pelas chamadas descritas no README do backend. Não se deve
inferir eventos a partir do texto livre nem gravá-los antecipadamente.

## Indicadores derivados

- Categorias e perguntas mais acessadas contam conversas distintas por item;
  uma repetição na mesma sessão não conta novamente.
- “Resolvidas sem agendamento” depende da resposta afirmativa ao evento
  `RESOLVED_ANSWERED`, não apenas de uma sessão terminada.
- Relatórios de resultado de agendamento usam a data do atendimento.
- A taxa de não comparecimento é `Não compareceu / (Atendido + Não compareceu)`.

## Código relacionado

- Fluxo e validação das opções: `src/backend/services/conversationFlow.service.ts`
- Conversa de agendamento: `src/backend/services/schedulingFlow.service.ts`
- Encerramento das sessões: `src/backend/services/conversationClosing.service.ts`
- Contrato e gravação de eventos: `src/backend/types/conversationEvent.types.ts`,
  `src/backend/utils/conversationEventData.ts`,
  `src/backend/services/conversationEvent.service.ts` e
  `src/backend/repositories/conversationEvent.repository.ts`
- Sessões, desfechos e timeout: `src/backend/repositories/session.repository.ts`
- Schema de eventos e sessões: `src/backend/db/migrations/11_sprint2_schema.sql`
  e `src/backend/db/migrations/13_conversation_events_data_checks.sql`
