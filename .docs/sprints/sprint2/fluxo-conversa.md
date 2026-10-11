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
       +-- sessão nova ------------------> STARTED
       |                                      |
       |                                      v
       |                                Mostrar categorias
       |
       +-- sessão ativa há mais de 30 min --> ABANDONED (etapa anterior)
       |                                      |
       |                                      v
       |                                Criar sessão nova
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
                                        Registrar resposta e status da IA
                                              |
                                              v
                                        Encerrar sessão com desfecho
```

## Passos atualmente executados

1. O backend valida o telefone e calcula seu HMAC; o número não é usado como
   identificador em claro para a sessão.
2. O repositório procura uma sessão ativa. Se não houver uma, cria a sessão e
   o serviço registra `STARTED` antes de apresentar as categorias.
3. Enquanto a sessão aguarda categoria, o bot interpreta a entrada como uma
   opção numérica. Uma opção válida produz `CATEGORY_CHOSEN`, atualiza a etapa
   e apresenta as perguntas daquela categoria.
4. Enquanto aguarda pergunta, uma opção válida produz `QUESTION_CHOSEN`. O
   motor obtém a resposta cadastrada e o fluxo registra `ANSWER_SENT`.
5. A sessão termina com `OUT_OF_SCOPE` para perguntas fora do escopo e
   `RESOLVED` para as demais respostas, conforme o comportamento implementado
   atualmente.

Entradas inválidas recebem novamente a lista de opções. O texto inválido não
é registrado como evento.

## Eventos e dados permitidos

Os eventos são gravados em `ConversationEvents` com tipo, referências
estruturadas e horário gerado pelo banco:

| Evento | Dados armazenados |
|---|---|
| `STARTED` | Tipo do evento |
| `CATEGORY_CHOSEN` | ID da categoria |
| `QUESTION_CHOSEN` | IDs da categoria e da pergunta |
| `ANSWER_SENT` | IDs da categoria e pergunta; estado da IA |
| `ABANDONED` | Etapa em que a sessão foi abandonada |

O estado da IA em `ANSWER_SENT` usa `llmStatus`:

- `NOT_CALLED`: o fluxo respondeu sem chamar IA;
- `USED`: uma resposta contou com IA;
- `FAILED`: a tentativa de uso da IA falhou.

O bot atual responde usando o catálogo e não chama IA; portanto, o valor
registrado hoje é `NOT_CALLED`. Os demais valores preservam uma distinção
necessária para quando o fluxo de IA for integrado.

**Nunca adicionar texto digitado pelo cidadão aos dados do evento, logs de
interação ou desfechos.** O contrato aceita apenas tipos e valores
estruturados. Nome e CPF pertencem ao processo de agendamento, que deve
armazená-los exclusivamente no registro do agendamento e aplicar as proteções
definidas para esses dados.

## Sessão, desfecho e abandono

Uma sessão em andamento tem `outcome = IN_PROGRESS`. Ao terminar, o serviço
grava seu estado final e horário de encerramento. Se a última interação tiver
mais de 30 minutos, o repositório, na transação que cria a próxima sessão:

1. seleciona e bloqueia a sessão expirada;
2. muda seu estado para `ABANDONED`;
3. copia a etapa corrente para `abandoned_at_step`;
4. cria um evento `ABANDONED` com a etapa;
5. cria ou localiza a sessão ativa para a nova mensagem.

A etapa guardada deve ser a etapa que a sessão aguardava antes de expirar, não
`FINISHED`. Isso permite agrupar abandonos por etapa sem salvar a mensagem que
o cidadão enviou.

## Eventos previstos para as próximas etapas

O schema e o tipo compartilhado também contemplam eventos de resolução e de
agendamento: `RESOLVED_ANSWERED`, `SCHEDULE_OFFERED`, `NO_SLOT`,
`SCHEDULE_DECLINED`, `ATTENDEE_CHOSEN`, `PHONE_NOTICE_SHOWN`,
`APPOINTMENT_CREATED`, `APPOINTMENT_CONSULTED`, `APPOINTMENT_RESCHEDULED` e
`APPOINTMENT_CANCELED`.

Esses eventos só devem ser emitidos quando os respectivos passos estiverem
ligados ao fluxo. A máquina atual ainda não implementa a pergunta “A dúvida
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
  `src/backend/services/conversationEvent.service.ts` e
  `src/backend/repositories/conversationEvent.repository.ts`
- Sessões, desfechos e timeout: `src/backend/repositories/session.repository.ts`
- Schema de eventos e sessões: `src/backend/db/migrations/11_sprint2_schema.sql`
