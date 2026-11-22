# Teste ponta a ponta do fluxo principal do chatbot (#18)

> Status: implementada
> Tipo: funcionalidade
> Tamanho: grande
> Branch: test/18-teste-e2e-fluxo-principal
> Criada em: 2026-11-22

## Objetivo

Hoje cada parte do chatbot é testada separada: o Gateway com dublês, o Backend com dublês e o banco nos testes de integração. Nenhum teste prova que uma mensagem que chega da Meta atravessa tudo (Gateway, Backend e banco) e volta como resposta ao cidadão.

Esta tarefa cria um teste automatizado de ponta a ponta. Ele simula as mensagens que a Meta entregaria, percorre os caminhos principais da conversa e confere o resultado no banco e na API do painel. A Meta real nunca é chamada: os envios de resposta são interceptados na saída do Gateway.

São dois cenários:

- **Cenário 1:** dúvida nova que termina em agendamento. Depois, a equipe assume o agendamento e o marca como atendido pelo painel.
- **Cenário 2:** o cidadão volta com um agendamento futuro e, em conversas separadas, remarca e cancela.

O teste roda no CI num job próprio, com um banco de dados próprio.

## Regras

| ID | Regra | Fonte |
|---|---|---|
| RN-01 | Uma dúvida nova segue esta ordem: saudação, categoria, pergunta, resposta e "A dúvida foi resolvida?". Se o cidadão responde "Não", o chatbot oferece o agendamento. | PO; decisão 008 |
| RN-02 | "A dúvida foi resolvida?" só aparece quando a pergunta não é "fora do escopo" e não "exige atendimento presencial". A pergunta fora do escopo nunca oferece agendamento. A que exige atendimento presencial oferece o agendamento direto, com o motivo "exige atendimento presencial". | PO; decisão 008 |
| RN-03 | No agendamento, o cidadão diz quem vai comparecer ("Eu mesmo"), informa o nome e o CPF do titular, escolhe o horário e recebe a confirmação com o título "Agendamento realizado" e o protocolo. O agendamento nasce Pendente e sem responsável. | PO; decisões 005 e 006 |
| RN-04 | Pelo painel, quem tem "Gerenciar agendamentos" assume um agendamento Pendente, que passa a Confirmado com essa pessoa como responsável. "Marcar como atendido" só existe a partir do dia do atendimento. | PO; decisão 006; regra 03 |
| RN-05 | Cada conversa tem exatamente um desfecho. Uma conversa que cria um agendamento termina como "Terminou em agendamento". Uma conversa de retorno que remarca ou cancela termina como "Remarcou ou cancelou agendamento existente". | PO; decisão 008 |
| RN-06 | Quem tem agendamento futuro, Pendente ou Confirmado, e volta a escrever pelo mesmo número abre uma conversa nova. Ela começa com "Você tem atendimento marcado em [data] às [hora]." e os botões Remarcar, Cancelar e Tenho outra dúvida. A conversa antiga não é retomada. | PO; decisão 008 |
| RN-07 | Cancelar pede confirmação por botão antes de agir. Depois disso, o agendamento fica Cancelado e o horário volta a ficar livre no chatbot. O histórico do agendamento registra "Cancelado pelo cidadão no chatbot". O cidadão recebe a mensagem final do cancelamento, e não o aviso de "a equipe cancelou". | PO; decisões 005 e 006 |
| RN-08 | Remarcar mantém o protocolo e registra no histórico "de X para Y". Se o agendamento estava Confirmado, ele volta a Pendente sem responsável. O cidadão recebe uma nova confirmação com o título "Agendamento remarcado". | PO; decisão 006 |
| RN-09 | Cada passo da conversa é gravado como um evento, com o tipo do passo. A conversa de retorno registra a consulta ao agendamento e a remarcação ou o cancelamento. O desfecho é gravado junto com o evento que fecha a conversa. | PO; decisão 010 |
| RN-10 | O texto que o cidadão digita nunca é gravado nos registros da conversa. Os testes conferem os eventos e o desfecho, e nunca o texto digitado. | PO; decisões 002 e 010 |
| RN-11 | O teste não depende da Meta real, do WhatsApp real nem da IA. As respostas que iriam para a Meta são interceptadas e conferidas. Qualquer outra chamada para fora faz o teste falhar. | PO |
| RN-12 | O teste roda no CI num job próprio, com um banco Postgres de serviço. | PO |

### Textos que o teste confere (tirados da implementação, não inventados)

| Momento | Texto exato | Fonte |
|---|---|---|
| Menu de retorno (texto dos botões) | "Você tem atendimento marcado em {dd/mm} às {HH:MM}." | `TEXTO_BOTOES_RETORNO` em `messageFormatter.service.ts` |
| Botões do menu de retorno | Remarcar, Cancelar, Tenho outra dúvida (ids `return_reschedule`, `return_cancel`, `return_other`) | `criarBotoesRetorno` |
| Pedido de confirmação do cancelamento | "Deseja mesmo cancelar o atendimento marcado em {dd/mm} às {HH:MM}? O cancelamento não pode ser desfeito.\n1. Sim, cancelar\n2. Não, manter" | `CONFIRMA_CANCELAMENTO` |
| Botões do cancelamento | Sim, cancelar e Não, manter (ids `cancel_yes`, `cancel_no`) | `criarBotoesConfirmaCancelamento` |
| Mensagem final do cancelamento | "Seu agendamento {PROTOCOLO} foi cancelado e o horário foi liberado. Para agendar novamente, envie uma mensagem para este número." | `RESPOSTA_CANCELADO` |
| Confirmação do agendamento | Título "Agendamento realizado" e a linha "Protocolo: {PROTOCOLO}" | `montarConfirmacaoAgendamento` e `formatarConfirmacaoAgendamento` |
| Confirmação da remarcação | Título "Agendamento remarcado" e o mesmo protocolo | `returnFlow.service.ts` (`rescheduleTo`) |

A data e a hora usam o fuso de São Paulo (`getLocalParts` com `America/Sao_Paulo`). O CI roda em UTC, então o teste calcula a data e a hora esperadas nesse fuso, e não no fuso da máquina.

### O que cada passo grava (tirado da implementação)

| Situação | Eventos da conversa (`ConversationEvents`, na ordem) | Desfecho da conversa | Histórico do agendamento (`AppointmentEvents`) |
|---|---|---|---|
| Cenário 1, conversa que agenda | `STARTED`, `CATEGORY_CHOSEN`, `QUESTION_CHOSEN`, `ANSWER_SENT` (llm `NOT_CALLED`), `RESOLVED_ANSWERED` (resolved false), `SCHEDULE_OFFERED` (reason `NOT_RESOLVED`), `ATTENDEE_CHOSEN` (by_representative false), `PHONE_NOTICE_SHOWN`, `APPOINTMENT_CREATED` | `SCHEDULED` | `CREATED` |
| Cenário 1, ações no painel | nenhum | não muda | `CLAIMED`, depois `ATTENDED` |
| Cenário 2, conversa que remarca (agendamento estava Confirmado) | `STARTED`, `APPOINTMENT_CONSULTED`, `APPOINTMENT_RESCHEDULED` (from, to) | `MANAGED_APPOINTMENT` | `RESCHEDULED` (data from, to) e `BACK_TO_PENDING` (reason `RESCHEDULED`) |
| Cenário 2, conversa que cancela | `STARTED`, `APPOINTMENT_CONSULTED`, `APPOINTMENT_CANCELED` | `MANAGED_APPOINTMENT` | `CANCELED_BY_CITIZEN`, sem `CITIZEN_NOTIFIED` nem `CITIZEN_NOTIFICATION_FAILED` |

O texto "Cancelado pelo cidadão no chatbot" é o rótulo do painel para o evento `CANCELED_BY_CITIZEN` (`src/frontend/src/locales/pt-BR/appointmentDetail.json`). O teste do backend confere o tipo do evento. O rótulo é responsabilidade da tela e fica fora deste teste.

## Critérios de aceite

Cenário 1: dúvida nova que termina em agendamento

- **CA-01** (RN-01, RN-02): QUANDO o cidadão manda a saudação, escolhe a categoria e uma pergunta que não é fora do escopo nem exige atendimento presencial, ENTÃO o sistema DEVE mandar a resposta e, em seguida, os botões Sim e Não de "A dúvida foi resolvida?".
- **CA-02** (RN-01, RN-02): QUANDO o cidadão responde "Não", ENTÃO o sistema DEVE oferecer o agendamento, e o evento de oferta DEVE ter o motivo "não resolvida", e não "exige presencial".
- **CA-03** (RN-03): QUANDO o cidadão escolhe "Eu mesmo", informa o nome e o CPF e escolhe o primeiro horário oferecido, ENTÃO o sistema DEVE mandar a confirmação com o título "Agendamento realizado" e um protocolo de 8 caracteres. O agendamento desse protocolo DEVE existir como Pendente, sem responsável e no horário escolhido.
- **CA-04** (RN-05, RN-09): QUANDO a conversa do CA-03 termina, ENTÃO ela DEVE ter o desfecho "Terminou em agendamento" e os eventos da tabela acima, na ordem e com os dados indicados.
- **CA-05** (RN-04): QUANDO uma pessoa da equipe entra no painel com e-mail e senha e assume o agendamento, ENTÃO ele DEVE passar a Confirmado, com essa pessoa como responsável, e o histórico DEVE registrar a ação de assumir.
- **CA-06** (RN-04): QUANDO o dia do atendimento chega e a mesma pessoa marca o agendamento como atendido pelo painel, ENTÃO ele DEVE ficar Atendido, o detalhe do agendamento no painel DEVE mostrar o status Atendido e o nome do titular, e o histórico DEVE registrar o atendimento.

Cenário 2: retorno de quem já tem agendamento

- **CA-07** (RN-06, RN-09): QUANDO o cidadão com agendamento futuro volta a escrever, ENTÃO o sistema DEVE abrir uma conversa nova, que começa com "Você tem atendimento marcado em {dd/mm} às {HH:MM}." (a data e a hora do agendamento, no fuso de São Paulo) e os botões Remarcar, Cancelar e Tenho outra dúvida. Essa conversa DEVE registrar a consulta ao agendamento.
- **CA-08** (RN-08, RN-05, RN-09): QUANDO o agendamento estava Confirmado e o cidadão toca em Remarcar e escolhe outro horário, ENTÃO o sistema DEVE mandar a confirmação "Agendamento remarcado" com o mesmo protocolo. O agendamento DEVE estar no horário novo, de volta a Pendente e sem responsável. O histórico DEVE registrar a remarcação "de X para Y" e a volta a Pendente pela remarcação. A conversa DEVE terminar como "Remarcou ou cancelou agendamento existente", com o evento de remarcação.
- **CA-09** (RN-07): QUANDO o cidadão toca em Cancelar, ENTÃO o sistema DEVE pedir a confirmação com o texto e os botões da tabela, e nada DEVE mudar no agendamento antes da confirmação.
- **CA-10** (RN-07, RN-05, RN-09): QUANDO o cidadão confirma o cancelamento, ENTÃO o sistema DEVE mandar a mensagem final do cancelamento com o protocolo. O agendamento DEVE ficar Cancelado, e o histórico DEVE registrar o cancelamento pelo cidadão. A conversa DEVE terminar como "Remarcou ou cancelou agendamento existente", com o evento de cancelamento.
- **CA-11** (RN-07): QUANDO o cancelamento do CA-10 acontece com o aviso de cancelamento pela equipe ligado, ENTÃO o sistema NÃO DEVE mandar mensagem de modelo ao cidadão, e o histórico NÃO DEVE registrar aviso enviado nem falha de aviso.
- **CA-12** (RN-07, RN-06): QUANDO, depois do cancelamento, o mesmo cidadão volta a escrever, ENTÃO o sistema DEVE começar pela lista de categorias, sem o menu de retorno. Ao seguir até a escolha do horário, o horário cancelado DEVE aparecer de novo entre os oferecidos. A agenda do teste tem uma vaga por horário, então isso prova que a vaga foi liberada.

Regras gerais

- **CA-13** (RN-10): QUANDO qualquer conversa dos cenários termina (desfecho diferente de "Em andamento"), ENTÃO nenhum evento dessa conversa DEVE conter o nome ou o CPF digitados, e o rascunho da conversa DEVE estar vazio. A conversa da checagem do CA-12 fica em andamento na escolha do horário, com o rascunho preenchido por desenho, e não entra nesta checagem.
- **CA-14** (RN-11): QUANDO qualquer teste termina, ENTÃO nenhuma chamada DEVE ter saído para um endereço que não seja a Meta interceptada ou os próprios Gateway e Backend do teste. Toda resposta interceptada DEVE ir para o número do cidadão do teste, com o identificador do número e o token de acesso configurados para o teste.
- **CA-15** (RN-11): QUANDO a IA está desligada para a pergunta do teste, ENTÃO a resposta DEVE ser entregue sem IA (evento de resposta com "IA não chamada").
- **CA-16** (RN-12): QUANDO um pull request ou um push roda o CI, ENTÃO o job do teste ponta a ponta DEVE subir o próprio Postgres, aplicar as migrations, checar os tipos do teste e rodar o teste. Os jobs que já existem DEVEM continuar como estão.
- **CA-17** (RN-12): QUANDO os jobs de unidade e de integração do backend rodam, ENTÃO eles NÃO DEVEM executar nem checar os tipos dos arquivos do teste ponta a ponta. Esses jobs não instalam as dependências do Gateway.
- **CA-18** (RN-11): QUANDO o teste termina, com sucesso ou com falha, ENTÃO a agenda, a configuração do WhatsApp e os dados do teste (conversas, agendamentos, pergunta e conta da equipe) DEVEM voltar ao estado de antes. Os dados de outros testes no mesmo banco NÃO DEVEM ser apagados.

## Critérios de sucesso

- O job `backend-e2e` passa no CI do pull request, e os jobs `frontend`, `backend`, `gateway` e `backend-integration` continuam passando.
- Se um elo do caminho principal for quebrado de propósito, o teste falha. Exemplos: a assinatura do webhook, a rota de sessões do Backend, a gravação do desfecho ou o envio pelo Gateway.
- O teste roda localmente com um único comando, contra um Postgres descartável, seguindo o guia.

## Fora do escopo

- IA e Ollama: ficam desligados (a pergunta do teste não permite IA). Qualquer chamada para fora faz o teste falhar.
- Teste de tela do painel: o painel é exercitado só pela API.
- WhatsApp real, a Meta real, Playwright e Cypress: só Vitest.
- "Tenho outra dúvida" no menu de retorno, remarcação sem horário livre, perguntas fora do escopo e perguntas que exigem atendimento presencial. São caminhos já cobertos por testes de unidade e de integração. Decisão da PO (D-PO-01).
- Lembrete, aviso de cancelamento pela equipe e mensagens de modelo: são outros fluxos.
- Atomicidade do desfecho com o evento ("mesma transação"): um teste ponta a ponta não observa isso. Ela já é provada pelos testes de integração do repositório (`citizenAppointment.integration.test.ts` e `citizenReschedule.race.integration.test.ts`). Aqui o teste confere só que o desfecho e o evento estão os dois gravados.
- Issue #59: fechada no PR #142 e não bloqueia.

## Desenho

### Peças e caminho de uma mensagem

1. O teste monta o corpo que a Meta mandaria para o webhook (mensagem de texto ou resposta de botão ou lista), assina com o segredo do app de teste (HMAC SHA-256) e faz o POST em `/webhooks/whatsapp` do Gateway.
2. O Gateway busca a configuração no Backend (`GET /api/v1/internal/whatsapp/config`, com `X-Internal-Token`), valida a assinatura, remove duplicadas, enfileira por telefone e chama `POST /api/v1/whatsapp/sessions` no Backend.
3. O Backend roda o fluxo da conversa, grava no Postgres e devolve `reply.messages` na resposta HTTP.
4. O Gateway manda cada mensagem para `https://graph.facebook.com/{versão}/{phone_number_id}/messages` com `fetch`. O falso da Meta intercepta essa chamada, guarda o corpo e responde 200 com um id falso. O indicador de digitação (`status: read`, sem `to`) também cai no falso e é ignorado na leitura das mensagens.
5. O webhook responde 200 com `data.results`. O POST só volta depois que o processamento termina, então o teste lê as mensagens interceptadas logo depois.
6. O painel é exercitado direto na app do Backend, com supertest: login real, cookie e cabeçalho `Origin`.

Backend e Gateway rodam no mesmo processo do Vitest, cada um ouvindo numa porta local (`127.0.0.1`, porta 0). O Backend precisa de porta real porque o Gateway o chama por `fetch`. O Gateway também precisa de porta real para o Backend alcançar a rota interna de modelos no CA-11 (`GATEWAY_INTERNAL_URL`). O falso do `fetch` deixa passar as chamadas a `127.0.0.1`.

### Fatos do código que o desenho respeita

- Importar `src/gateway/app.ts` roda `validateEnv()`, que encerra o processo (`process.exit(1)`) se faltar `BACKEND_INTERNAL_URL` ou `GATEWAY_INTERNAL_TOKEN`. Por isso a config do Vitest do e2e define um `BACKEND_INTERNAL_URL` provisório. O cliente do Gateway lê a variável a cada chamada, então o valor real pode ser trocado depois do `listen`.
- O Gateway guarda a configuração do WhatsApp em cache por 60 segundos, por instância do módulo. Cada arquivo de teste roda isolado, então cada um lê a configuração de teste.
- O Gateway importa `express`, `helmet` e outros de `src/gateway/node_modules`. O job do e2e precisa de `npm ci` nas duas pastas.
- `tsconfig.json` do Backend usa `rootDir: "."`. Importar `../../../gateway/app` quebra o `typecheck:test`. Por isso o e2e tem o próprio `tsconfig.e2e.json` (`rootDir: ".."`), e `tsconfig.test.json` passa a excluir `tests/e2e`.
- `vitest.config.mts` (unidade) inclui `**/*.test.ts` e hoje só exclui `tests/integration/**`. Ele precisa excluir `tests/e2e/**`, ou o `npm test` do job `backend` tentaria rodar o e2e sem banco e sem as dependências do Gateway.
- `vitest.integration.config.mts` inclui só `tests/integration/**/*.test.ts`. O `test:integration` já ignora `tests/e2e` e **não precisa de mudança**. Isso responde a pergunta do job de CI.
- `createTestQuestion` (helpers de integração) cria a pergunta com `requires_in_person = true`. O e2e precisa trocar para `false`, e também `out_of_scope = false` e `llm_allowed = false`, ou "A dúvida foi resolvida?" nunca aparece.
- `cleanupScheduleTestData` apaga a categoria de teste pelo título "Categoria Agenda Teste", além das conversas e dos agendamentos dos telefones informados. Como os arquivos do e2e rodam em série, isso é seguro entre eles.
- O desfecho da conversa e o evento que a fecha são gravados por `finishSessionWith`, que também limpa o rascunho (`draft = NULL`).
- `PHONE_NOTICE_SHOWN` é gravado sempre que o agendamento é criado, com ou sem lembrete e aviso ligados.
- As mensagens de modelo saem do Backend para o Gateway (`POST {GATEWAY_INTERNAL_URL}/internal/whatsapp/messages/template`) e do Gateway para a Graph API. Com as duas portas reais e o falso da Meta, um modelo enviado por engano aparece no falso como `type: "template"`.
- "Marcar como atendido" usa o relógio do processo (`isDateOnOrBeforeToday`). O agendamento sempre nasce no futuro, porque a agenda do teste tem antecedência mínima de 1 dia. Por isso, no CA-06 o teste muda a data do agendamento direto no banco para 1 minuto atrás, antes de marcar como atendido, com `moveAppointmentToPast`, sem relógio falso (decisão do usuário, D-US-02). Isso é preparo de dado do teste, e não comportamento do painel.
- O login real é `POST /api/v1/auth/login` com `{ email, password }` e `Origin` igual a `FRONTEND_ORIGIN`. Ele devolve o cookie `proconchat_access` em `Set-Cookie`. `createTestUser({ password })` grava a senha com bcrypt. O login só atualiza `last_login_at`, então `deleteTestUsers` continua apagando a conta.
- Os testes de integração usam os telefones `5500000000981` a `5512999991006`, incluindo `5512999990740`. A faixa `5512999990781` a `5512999990784` está livre.

### Contrato da base comum (T1)

Todos os arquivos ficam em `src/backend/`. Os nomes, as assinaturas e o comportamento abaixo são fixos. Vênus (T3) escreve contra este contrato desde a Fase 1.

**Configuração e scripts**

- `vitest.e2e.config.mts`:
  - `include: ["tests/e2e/**/*.e2e.test.ts"]`, `fileParallelism: false`, `testTimeout: 60000` e `hookTimeout: 60000`;
  - `env` com os mesmos valores de teste do `vitest.integration.config.mts`, mais `BACKEND_INTERNAL_URL: "http://127.0.0.1:9"` (provisório, trocado em `startE2eEnvironment`);
  - o `DB_URL` vem do ambiente, como na integração.
- `tsconfig.e2e.json`: estende `tsconfig.json`, com `noEmit: true`, `rootDir: ".."` e `include: ["tests/e2e/**/*.ts"]`.
- `tsconfig.test.json`: acrescenta `"tests/e2e"` ao `exclude`. `vitest.config.mts`: acrescenta `"tests/e2e/**"` ao `exclude`.
- `package.json` (scripts): `"typecheck:e2e": "tsc -p tsconfig.e2e.json"` e `"test:e2e": "vitest run --config vitest.e2e.config.mts"`.
- Todo arquivo de teste do e2e, inclusive os testes dos helpers, termina em `.e2e.test.ts`. É o único padrão que a config inclui.

**`tests/e2e/helpers/phones.ts`**

```ts
export const E2E_PHONES = {
    fluxoPrincipal: "5512999990781",
    remarcar: "5512999990782",
    cancelar: "5512999990783",
} as const
export const ALL_E2E_PHONES: string[]
export const E2E_CPFS: Record<keyof typeof E2E_PHONES, string>
```

Cada cenário usa só o próprio telefone e o próprio CPF (válido e fictício, um por chave de `E2E_PHONES`). O CA-12 reusa o telefone e o CPF de `cancelar`, porque a regra é a do mesmo cidadão. A recusa de agendamento duplicado compara o CPF e o horário exato (`hasActiveAppointmentForCpf`). CPFs diferentes por telefone evitam que um cenário dependa do outro.

**`tests/e2e/helpers/metaFake.ts`**

```ts
export interface GraphCall { url: string; authorization: string | null; body: Record<string, unknown> }
export interface SentMessage { to: string; type: "text" | "list" | "buttons" | "template" | "other"; text: string; optionIds: string[] }
export function toSentMessage(call: GraphCall): SentMessage | null
export interface MetaFake {
    graphCalls: GraphCall[]
    unexpectedCalls: string[]
    sentSince(index: number): SentMessage[]
    sentTo(phone: string): SentMessage[]
    restore(): void
}
export function installMetaFake(): MetaFake
```

- `installMetaFake` troca o `fetch` global (`vi.stubGlobal`):
  - `graph.facebook.com`: guarda a chamada e responde 200 com `{ messages: [{ id: "wamid.e2e.<n>" }] }`;
  - `127.0.0.1`: repassa ao `fetch` real;
  - qualquer outro endereço: guarda em `unexpectedCalls` e lança erro.
- `toSentMessage` lê o corpo da Graph API:
  - `type: "text"` vira `text`;
  - `interactive.type: "list"` vira `list`, com os ids de todas as linhas;
  - `interactive` de botões vira `buttons`, com os ids dos botões;
  - `type: "template"` vira `template`;
  - corpo sem `to` (indicador de digitação) devolve `null`.
- `restore` desfaz a troca (`vi.unstubAllGlobals`).

**`tests/e2e/helpers/whatsappSettingsDb.ts`**

```ts
export const E2E_WHATSAPP: { phoneNumberId: string; accessToken: string; appSecret: string; verifyToken: string }
export type WhatsAppSettingsSnapshot = Record<string, unknown> | undefined
export function snapshotWhatsAppSettings(): Promise<WhatsAppSettingsSnapshot>
export function useE2eWhatsAppSettings(): Promise<void>
export function setCancellationNotice(enabled: boolean): Promise<void>
export function restoreWhatsAppSettings(snapshot: WhatsAppSettingsSnapshot): Promise<void>
```

- Os valores de `E2E_WHATSAPP` são fictícios e públicos, só de teste, e nunca credenciais reais.
- `useE2eWhatsAppSettings` grava a linha 1 com esses valores (token e segredo cifrados com `encrypt`), sem pausa e com `cancellation_notice_enabled = false`.
- `setCancellationNotice` muda só o interruptor.
- `restoreWhatsAppSettings` devolve a linha exatamente como estava, ou apaga a linha se ela não existia.

**`tests/e2e/helpers/citizen.ts`**

```ts
export type CitizenInput = { text: string } | { optionId: string }
export function buildWebhookBody(phone: string, input: CitizenInput, messageId: string): string
export function signWebhookBody(rawBody: string, appSecret: string): string
export interface Citizen {
    phone: string
    say(text: string): Promise<SentMessage[]>
    tap(optionId: string): Promise<SentMessage[]>
    tapAcrossPages(wanted: (optionId: string) => boolean): Promise<string>
    lastReply(): SentMessage[]
    optionIds(): string[]
    replyText(): string
    slotIds(): string[]
}
export function createCitizen(env: E2eEnvironment, phone: string): Citizen
```

- `buildWebhookBody` monta o JSON do webhook da Cloud API:
  - `object: "whatsapp_business_account"` e `metadata.phone_number_id = E2E_WHATSAPP.phoneNumberId`;
  - texto vira `type: "text"`;
  - opção vira `type: "interactive"`. Os ids `return_*`, `cancel_*`, `resolved_*`, `schedule_*` e `attendee_*` vão como `button_reply`, e os demais como `list_reply`.
- `signWebhookBody` devolve `sha256=<hex>`.
- Cada envio do `Citizen`:
  - gera um id de mensagem único;
  - faz o POST assinado no Gateway;
  - exige 200 e `data.results` com `status: "processed"`;
  - guarda como `lastReply` as mensagens interceptadas depois do envio;
  - exige que todas sejam para `phone`.
- `tap` exige que o id esteja entre as opções da última resposta.
- `tapAcrossPages` procura o id nas páginas (`page_*`) e para depois de 30 páginas.

**`tests/e2e/helpers/e2eEnvironment.ts`**

```ts
export interface E2eStaff { id: number; email: string; password: string }
export interface E2eEnvironment {
    backendApp: Express
    gatewayUrl: string
    meta: MetaFake
    categoryId: number
    questionId: number
    staff: E2eStaff
}
export function startE2eEnvironment(): Promise<E2eEnvironment>
export function stopE2eEnvironment(env: E2eEnvironment | undefined): Promise<void>
```

`startE2eEnvironment`, nesta ordem:

1. Sobe o Backend e o Gateway em `127.0.0.1:0`. Define `BACKEND_INTERNAL_URL` e `GATEWAY_INTERNAL_URL` com as portas reais.
2. Instala o falso da Meta. Limpa os dados de `ALL_E2E_PHONES` (`cleanupScheduleTestData`).
3. Tira o retrato da agenda (`snapshotScheduleConfig`) e do WhatsApp. Aplica `useE2eWhatsAppSettings` e a agenda fixa:
   - todos os 7 dias, das 08:00 às 18:00, horários de 30 minutos e 1 vaga por horário;
   - janela de 30 dias, antecedência mínima de 1 dia e lembrete desligado;
   - endereço "Rua do Procon, 100".
4. Cria a pergunta com `createTestQuestion` e a troca para `requires_in_person = false`, `out_of_scope = false` e `llm_allowed = false`.
5. Cria a conta da equipe com `createTestUser({ permissions: ["appointments.view", "appointments.manage"], password })` e guarda o e-mail e a senha.

`stopE2eEnvironment` faz o inverso, sempre até o fim (com `runAllSteps`: cada passo roda mesmo se o anterior falhar), e aceita `undefined` quando o início falhou:

1. Desfaz o falso da Meta.
2. Limpa os dados de `ALL_E2E_PHONES`.
3. Restaura a agenda e o WhatsApp.
4. Apaga a conta da equipe.
5. Fecha os dois servidores e encerra o pool (`getPool().end()`).

**`tests/e2e/helpers/runAllSteps.ts`** (acrescentado depois da revisão, sugestão b do Saturno, commit 05ea021)

```ts
export function runAllSteps(steps: (() => Promise<void>)[]): Promise<void>
```

- Roda os passos na ordem, um depois do outro.
- Se um passo falha, os seguintes rodam mesmo assim.
- No fim, se algum falhou, lança o primeiro erro, e não os seguintes.
- Teste próprio: `runAllSteps.e2e.test.ts`.

**`tests/e2e/helpers/journeys.ts`**

```ts
export function protocolOf(replyText: string): string
export function expectedWhen(datetime: Date): string
export function bookThroughChat(env: E2eEnvironment, citizen: Citizen, holder: { name: string; cpf: string }): Promise<string>
export function goToSlotList(env: E2eEnvironment, citizen: Citizen, holder: { name: string; cpf: string }): Promise<void>
```

- `protocolOf` extrai os 8 caracteres depois de "Protocolo:".
- `expectedWhen` devolve "dd/mm às HH:MM" no fuso `America/Sao_Paulo`, calculado com `Intl`, sem importar `formatarQuando`.
- `bookThroughChat` faz este caminho e devolve o protocolo:
  1. "oi", a categoria `cat_{categoryId}` e a pergunta `q_{questionId}`;
  2. exige `resolved_yes` e `resolved_no`, e toca `resolved_no`;
  3. toca `schedule_yes` e `attendee_self`;
  4. informa o nome e o CPF de `holder`;
  5. toca o primeiro `slot_*` e exige "Agendamento realizado".
- `goToSlotList` faz o mesmo caminho até a lista de horários, sem escolher um horário.

**`tests/e2e/helpers/panel.ts`**

```ts
export type PanelAction = "claim" | "attended"
export function loginStaff(env: E2eEnvironment): Promise<string>
export function panelAction(env: E2eEnvironment, cookie: string, appointmentId: number, action: PanelAction): Promise<request.Response>
export function appointmentDetail(env: E2eEnvironment, cookie: string, appointmentId: number): Promise<request.Response>
```

- `loginStaff` faz o login real e devolve o cabeçalho `Cookie` com `proconchat_access`.
- `panelAction` faz `PATCH /api/v1/appointments/:id/status` com `{ action }`, o cookie e o `Origin`.
- `appointmentDetail` faz `GET /api/v1/appointments/:id`.

**`tests/e2e/helpers/e2eDb.ts`**

```ts
export interface E2eAppointment { id: number; status: string; assignedUserId: number | null; appointmentDatetime: Date; rescheduledFrom: Date | null }
export interface E2eSessionEvent { type: string; appointmentId: number | null; data: Record<string, unknown> }
export interface E2eSession { id: number; status: string; outcome: string; draft: unknown; events: E2eSessionEvent[] }
export function appointmentByProtocol(protocol: string): Promise<E2eAppointment>
export function sessionsOfPhone(phone: string): Promise<E2eSession[]>
export function moveAppointmentToPast(appointmentId: number): Promise<void>
```

- `appointmentByProtocol` exige exatamente uma linha.
- `sessionsOfPhone` busca pelo `phone_hash` (`hashPhone`), da mais antiga para a mais nova, com os eventos em ordem de `id`.
- O histórico do agendamento é lido com `eventsOf`, que já existe em `tests/integration/helpers/usersDb.ts`.

**Uso em cada arquivo de cenário**

- `beforeAll`: `env = await startE2eEnvironment()`.
- `afterEach`: exige `env.meta.unexpectedCalls` vazio.
- `afterAll`: `await stopE2eEnvironment(env)`.

Nenhum arquivo de cenário mexe na agenda, no WhatsApp ou em telefones de outro cenário. A exceção é `setCancellationNotice(true)` no teste do cancelamento. A restauração do WhatsApp no `afterAll` o desfaz.

## Plano de execução

Gates do projeto (rodar a partir da raiz da worktree):

- Gate rápido e2e:
  1. `cd src/backend && npm run typecheck:test && npm run typecheck:e2e && npx oxlint <arquivos alterados>`;
  2. o teste da tarefa no Postgres descartável do dev: `DB_URL=<url do container> npx vitest run --config vitest.e2e.config.mts <arquivo>`.
  - O Backend e o Gateway não têm formatador, então não há checagem de formatação.
  - Antes do primeiro uso, rodar `npm ci` em `src/gateway`, porque a worktree não tem `node_modules` do Gateway.
- Postgres descartável, um por dev:
  - os testes trocam a agenda e a configuração do WhatsApp do banco inteiro, então dois devs no mesmo banco se atrapalham;
  - Marte usa a porta `55418` e Vênus a `55419`;
  - modelo: `docker run --rm -d --name proconchat-e2e-<dev> -e POSTGRES_DB=proconchat -e POSTGRES_USER=proconchat -e POSTGRES_PASSWORD=proconchat_ci -p 127.0.0.1:<porta>:5432 postgres:15-alpine`, depois `DB_URL=postgresql://proconchat:proconchat_ci@127.0.0.1:<porta>/proconchat npm run db:migrate`;
  - os valores são os mesmos do CI e não são segredos.
- Gate CI (T4): `cd src/backend && npm run typecheck:test`, `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"` e a leitura do diff. O job só roda de verdade depois do push, que os devs não fazem.
- Gate doc (T5): os links relativos abrem, os comandos batem com os scripts de `package.json` e com o job do CI, e nenhum valor do `.env` aparece.
- Typecheck: `typecheck:test` leva cerca de 5 s (medido em 2026-11-22). Não é lento e fica no gate de cada tarefa.

Gate de fase (rodado uma vez ao fim de cada fase, antes do reviewer, igual ao CI):

- backend: `cd src/backend && npm run lint && npm run build && npm run typecheck:test && npm test`.
- gateway: `cd src/gateway && npm ci && npm run lint && npm run build && npm test`.
- backend-e2e local: `cd src/backend && npm run typecheck:e2e && DB_URL=<Postgres descartável> npm run test:e2e`.
- backend-integration e backend-e2e no CI: conferidos depois do push, e o resultado é registrado no Status das tarefas.

Fases:

- **Fase 1 (paralelo):** T1 [P] (Marte), T4 [P] (Netuno), T5 [P] (Plutão).
  - Vênus já pode escrever T3 contra o contrato do Desenho, mas só roda o gate dela depois do commit de T1.
  - Gate de fase: backend, gateway e backend-e2e local (só os testes dos helpers).
- **Fase 2 (paralelo):** T2 [P] (Marte, depois de T1) e T3 [P] (Vênus, depois de T1).
  - Gate de fase: backend, gateway e backend-e2e local (suíte e2e completa).
  - Em seguida, push e conferência dos jobs `backend-e2e` e `backend-integration` no CI.
  - T5 é conferida de novo contra o que T2 e T3 entregaram.
  - Resultado do gate de fase (em b99543f): passou. Frontend com 2248 testes, backend com 2068, gateway com 256, integração com 438 e `test:db`, e2e com 26. A branch está 0 commits atrás de `origin/develop`, sem conflito.
  - Revisão final do Saturno: a #18 está aprovada, sem achado em aberto. As 3 sugestões do primeiro relatório (commits ed1c51d, e411983 e 05ea021) e a sugestão (a) da rodada seguinte (commit e90ac51) foram aplicadas por decisão do usuário.
  - Pendência do CI resolvida: no PR #177 (run 45061194673), os 5 checks passaram, incluindo o `backend-e2e` (33 s, 6 arquivos e 29 testes).

Quem edita o quê, para as tarefas [P] não se cruzarem:

- `src/backend/package.json`, `vitest.config.mts`, `vitest.e2e.config.mts`, `tsconfig.test.json`, `tsconfig.e2e.json` e `tests/e2e/helpers/**`: só T1.
- `tests/e2e/fluxoPrincipal.e2e.test.ts`: só T2. `tests/e2e/retornoCidadao.e2e.test.ts`: só T3.
- `.github/workflows/ci.yml`: só T4, que acrescenta o job `backend-e2e` e não mexe nos outros jobs.
- `src/backend/README.md` e `.docs/architecture/architecture.md`: só T5.
- Se T2 ou T3 precisarem de um helper novo ou de uma mudança no contrato, pedem a Marte (T1). O pedido é registrado aqui antes da mudança.

Regras para todas as tarefas:

- nunca escrever comentários no código;
- TDD:
  - nos helpers com lógica (`toSentMessage`, `buildWebhookBody`, `signWebhookBody`, `protocolOf` e `expectedWhen`), o teste do helper é escrito e falha antes do código;
  - nos cenários, o teste é de regra que já existe e deve passar de primeira, e isso fica registrado;
  - se um cenário falhar por um defeito do sistema, a falha é registrada como achado, e o teste não é ajustado para passar;
- nunca alterar teste para fazê-lo passar;
- limpeza só pelo escopo do teste: telefones de `E2E_PHONES`, a categoria de teste e a conta criada. Nunca `TRUNCATE` nem `DELETE` sem filtro, exceto a linha única de `WhatsAppSettings` e as tabelas de agenda, que são restauradas pelo retrato;
- um commit atômico por tarefa, só com os caminhos exatos (`git add <arquivo>` e `git commit -m "..." -- <arquivos>`), sem `Co-Authored-By` e sem push;
- padrão de commit:
  - `Test :test_tube: [#18] ...` para T1, T2 e T3;
  - `Build :rocket: [#18] ...` para T4 (decisão do usuário, D-US-01);
  - `Docs :bulb: [#18] ...` para T5.

## Tarefas

### T1 [P] Base comum do teste ponta a ponta
- O quê: configuração, scripts e todos os helpers do contrato, com teste próprio dos helpers que têm lógica.
- Onde:
  - `src/backend/vitest.e2e.config.mts`, `src/backend/tsconfig.e2e.json`, `src/backend/tsconfig.test.json`, `src/backend/vitest.config.mts` e `src/backend/package.json` (só os dois scripts);
  - `src/backend/tests/e2e/helpers/` (`phones.ts`, `metaFake.ts`, `whatsappSettingsDb.ts`, `citizen.ts`, `e2eEnvironment.ts`, `journeys.ts`, `panel.ts`, `e2eDb.ts` e `runAllSteps.ts`);
  - os testes `metaFake.e2e.test.ts`, `citizen.e2e.test.ts`, `journeys.e2e.test.ts` e `runAllSteps.e2e.test.ts`.
- Dev: Marte (dev-backend)
- Depende de: nada
- Reaproveita:
  - `tests/integration/helpers/scheduleDb.ts`: `snapshotScheduleConfig`, `useScheduleConfig`, `restoreScheduleConfig`, `createTestQuestion` e `cleanupScheduleTestData`;
  - `usersDb.ts`: `createTestUser`, `deleteTestUsers` e `eventsOf`;
  - `phone.ts`: `hashPhone`;
  - `encrypt` de `utils/crypto.utils.ts`;
  - a referência em `/home/felipe/faculdade/ProconChat_wt/test-18/src/backend/tests/e2e/`, só para leitura e sem copiar commits.
- Atende: CA-14, CA-17, CA-18 e a base de todos os outros
- Passos:
  1. Escrever os testes dos helpers puros e vê-los falhar:
     - `toSentMessage` com texto, lista, botões, modelo e corpo sem `to`;
     - `buildWebhookBody` com `button_reply` e `list_reply`;
     - `signWebhookBody` contra um HMAC calculado no teste;
     - `protocolOf`;
     - `expectedWhen` com um horário que vira o dia em UTC.
  2. Implementar `phones.ts`, `metaFake.ts` e `citizen.ts` até os testes passarem.
  3. Criar a config, o tsconfig, as exclusões e os scripts, e confirmar que `npm test` e `typecheck:test` não pegam `tests/e2e`.
  4. Implementar `whatsappSettingsDb.ts`, `e2eEnvironment.ts`, `journeys.ts`, `panel.ts` e `e2eDb.ts` com as assinaturas exatas do Desenho.
  5. Rodar o gate e commitar: `Test :test_tube: [#18] Cria a base comum do teste ponta a ponta`.
- Pronto quando:
  - as assinaturas batem com o Desenho;
  - os testes dos helpers passam no Postgres descartável;
  - `npm test` do backend não lista nenhum arquivo de `tests/e2e`;
  - `typecheck:test` e `typecheck:e2e` passam;
  - o oxlint passa nos arquivos novos.
- Teste: unitário dos helpers, dentro da config e2e. Falha primeiro o teste de `toSentMessage` que espera `type: "buttons"` com os ids dos botões.
- Gate: rápido e2e
- Modelo: padrao
- Status: feita (commit edc880c). Evidência: vermelho por módulo inexistente antes do código; verde com `test:e2e` (23 testes, 3 arquivos); `npm test` do backend com 2068 testes e sem `tests/e2e`; `typecheck:test` e `typecheck:e2e` ok; oxlint ok no backend e no gateway; build do backend e do gateway ok; 256 testes do gateway ok; verificação real no Postgres descartável passou e deixou o banco limpo. Revisão final do Saturno: aprovada. Sugestão do Saturno aplicada a pedido do usuário no commit 05ea021 (`stopE2eEnvironment` com `runAllSteps`: cada passo de restauração roda mesmo se o anterior falhar, com teste escrito antes; `test:e2e` com 6 arquivos e 29 testes ok). Vermelho do `runAllSteps.e2e.test.ts` antes do código: 3 casos (tudo na ordem; segue após falha; lança o primeiro erro e não os seguintes) falharam com "Cannot find module './helpers/runAllSteps'". Prova por mutação do Saturno: com o `runAllSteps` parando no primeiro erro, o teste "roda os passos seguintes..." falha. Revisão final do Saturno: 05ea021 aprovado, com lint, build, `typecheck:test`, `npm test` (2068), `db:migrate`, `typecheck:e2e` e `test:e2e` (6 arquivos, 29 testes) ok em 05ea021; branch 0 commits atrás de `origin/develop`.

### T2 [P] Cenário 1: dúvida nova termina em agendamento, assumido e atendido pelo painel
- O quê: o arquivo `fluxoPrincipal.e2e.test.ts`, com o cenário 1 de ponta a ponta.
- Onde: `src/backend/tests/e2e/fluxoPrincipal.e2e.test.ts`
- Dev: Marte (dev-backend)
- Depende de: T1
- Reaproveita: `startE2eEnvironment`, `createCitizen`, `bookThroughChat`, `loginStaff`, `panelAction`, `appointmentDetail`, `appointmentByProtocol`, `sessionsOfPhone`, `moveAppointmentToPast` e `eventsOf`.
- Atende: CA-01 a CA-06, CA-13, CA-14, CA-15 e CA-18 (telefone `fluxoPrincipal`)
- Passos:
  1. Percorrer a conversa até "A dúvida foi resolvida?" (CA-01), responder "Não" (CA-02) e agendar com `bookThroughChat` (CA-03).
  2. Conferir o agendamento Pendente e sem responsável, a conversa com desfecho `SCHEDULED`, os eventos na ordem da tabela e o rascunho vazio, sem o nome nem o CPF nos eventos (CA-04, CA-13 e CA-15).
  3. Fazer o login real, assumir e conferir Confirmado, o responsável e `CLAIMED` (CA-05).
  4. Mover a data para o passado (preparo de dado, com o motivo do Desenho), marcar como atendido e conferir `ATTENDED` no banco e no detalhe da API (CA-06).
  5. Conferir que todas as chamadas à Meta foram para o telefone, o `phone_number_id` e o token do teste (CA-14), rodar o gate e commitar: `Test :test_tube: [#18] Cobre o fluxo principal de ponta a ponta até o atendimento`.
- Pronto quando:
  - o arquivo passa no Postgres descartável e não deixa dados depois do `afterAll`;
  - `typecheck:e2e` passa;
  - o oxlint passa.
- Teste: e2e. A regra já existe, então o teste deve passar de primeira, e isso fica registrado. Para provar que ele pega erro, confira uma vez, sem commitar, que trocar o segredo do app no corpo assinado faz o teste falhar.
- Gate: rápido e2e
- Modelo: padrao
- Status: feita (commit d5ecc24). Cobre CA-01 a CA-06, CA-13, CA-14 e CA-15. Evidência: passou de primeira, como previsto, por cobrir regra que já existia; a prova de que pega erro foi trocar o segredo da assinatura, que deu 401 (troca revertida); `test:e2e` com 5 arquivos e 26 testes passando; `typecheck:e2e` e oxlint ok; backend com lint, build, `typecheck:test` e `npm test` (2068) ok; gateway com lint, build e 256 testes ok. Revisão final do Saturno: achado que bloqueia (o CA-13 só conferia o CPF sem pontuação), corrigido no commit 1f3f9fe; a correção foi aprovada pelo Saturno (`test:e2e` com 26 testes ok), e a revisão aprovou a #18 sem achado que bloqueia, aprovação mantida depois dos ajustes e411983 (T3) e 05ea021 (T1).

### T3 [P] Cenário 2: retorno do cidadão, remarcar e cancelar
- O quê: o arquivo `retornoCidadao.e2e.test.ts`, com dois testes, um por conversa (remarcar e cancelar), cada um com o próprio telefone.
- Onde: `src/backend/tests/e2e/retornoCidadao.e2e.test.ts`
- Dev: Vênus (dev-backend)
- Depende de: T1 (Vênus pode escrever desde a Fase 1, contra o contrato do Desenho, mas o gate só roda depois do commit de T1)
- Reaproveita: os helpers de T1, `setCancellationNotice` e `eventsOf`.
- Atende: CA-07 a CA-14 e CA-18 (telefones `remarcar` e `cancelar`)
- Passos:
  1. Remarcar, com o telefone `remarcar`:
     - agendar com `bookThroughChat`, fazer o login e assumir pelo painel (Confirmado);
     - mandar "oi" e conferir o texto exato do menu, com `expectedWhen` e os três botões (CA-07).
  2. Tocar `return_reschedule` e escolher um horário diferente do atual. Conferir (CA-08):
     - "Agendamento remarcado" com o mesmo protocolo;
     - o horário novo, `rescheduled_from`, Pendente e sem responsável;
     - `RESCHEDULED` (from e to) e `BACK_TO_PENDING` (reason `RESCHEDULED`);
     - a conversa nova com `STARTED`, `APPOINTMENT_CONSULTED` e `APPOINTMENT_RESCHEDULED`, desfecho `MANAGED_APPOINTMENT` e rascunho vazio (CA-13).
  3. Cancelar, com o telefone `cancelar`:
     - agendar (Pendente) e ligar o aviso de cancelamento com `setCancellationNotice(true)`;
     - voltar, tocar `return_cancel` e conferir o texto e os botões da confirmação;
     - conferir que o agendamento continua Pendente antes da confirmação (CA-07 e CA-09).
  4. Tocar `cancel_yes`. Conferir (CA-10 e CA-11):
     - o texto exato de `RESPOSTA_CANCELADO` com o protocolo;
     - o agendamento Cancelado;
     - `CANCELED_BY_CITIZEN`, sem `CITIZEN_NOTIFIED` nem `CITIZEN_NOTIFICATION_FAILED`;
     - nenhuma mensagem `template` para o telefone;
     - a conversa com `APPOINTMENT_CONSULTED` e `APPOINTMENT_CANCELED` e o desfecho `MANAGED_APPOINTMENT`.
  5. Com o mesmo telefone, mandar "oi" e conferir a lista de categorias, sem o menu de retorno. Seguir com `goToSlotList` (essa conversa fica em andamento e fica fora do CA-13, que olha só as conversas terminadas) e conferir que o `slot_` do horário cancelado voltou a ser oferecido (CA-12). Rodar o gate e commitar: `Test :test_tube: [#18] Cobre a remarcação e o cancelamento pelo cidadão de ponta a ponta`.
- Pronto quando:
  - o arquivo passa no Postgres descartável, sozinho e junto com o de T2 (`npm run test:e2e`);
  - não deixa dados depois do `afterAll`;
  - `typecheck:e2e` e o oxlint passam.
- Teste: e2e. A regra já existe, então o teste deve passar de primeira, e isso fica registrado. Uma falha por defeito do sistema vira achado para o reviewer, e o teste não é ajustado.
- Gate: rápido e2e
- Modelo: padrao
- Status: feita (commit 3ddfe55). Cobre CA-07 a CA-14 e CA-18. Evidência: `typecheck:test` ok; `typecheck:e2e` sem erro no arquivo da tarefa; oxlint ok; os 2 testes passam. Passaram de primeira, como previsto, porque cobrem regra que já existia, e não acharam defeito no sistema. Revisão final do Saturno: aprovada. Sugestões do Saturno aplicadas a pedido do usuário no commit e411983 (CPF só com dígitos; o CA-12 com um "oi" só, independente da página de categorias). Revisão final do Saturno: e411983 aprovado. Sugestão (a) da segunda rodada aplicada por decisão do usuário no commit e90ac51: a checagem do CA-12 agora falha com qualquer botão `return_*`; a mutação que injeta `return_cancel` falha com "expected true to be false"; `test:e2e` com 6 arquivos e 29 testes ok. Revisão final do Saturno: e90ac51 aprovado.

### T4 [P] Job `backend-e2e` no CI
- O quê: um job novo no CI que sobe o Postgres, instala o Backend e o Gateway, aplica as migrations, checa os tipos do e2e e roda o teste.
- Onde: `.github/workflows/ci.yml` (só o bloco novo)
- Dev: Netuno (dev-devops)
- Depende de: nada (usa os nomes de script fixados no contrato: `typecheck:e2e` e `test:e2e`)
- Reaproveita: o bloco `services.postgres` e o `env` do job `backend-integration`.
- Atende: CA-16, CA-17
- Passos:
  1. Copiar o serviço Postgres 15 e o `env` do `backend-integration`, sem `DB_TEST_URL`, e acrescentar `BACKEND_INTERNAL_URL: http://127.0.0.1:9`.
  2. `setup-node` 24, com cache nos dois `package-lock.json` (Backend e Gateway).
  3. Passos: `npm ci` (Backend), `npm ci` em `src/gateway`, `npm run db:migrate`, `npm run typecheck:e2e` e `npm run test:e2e`.
  4. Não mexer nos jobs existentes. O `test:integration` não precisa excluir `tests/e2e`, porque a config dele só inclui `tests/integration/**`.
  5. Conferir a sintaxe com o gate CI e commitar: `Build :rocket: [#18] Adiciona o job do teste ponta a ponta no CI`.
- Pronto quando:
  - o YAML carrega;
  - o diff mostra só o job novo;
  - depois do push, o job `backend-e2e` passa e os outros continuam passando, com o resultado registrado no Status.
- Teste: nenhum (configuração de CI). A verificação é a execução no CI.
- Gate: CI
- Modelo: economico
- Status: feita (commit 1c8cf6a). Evidência: o YAML carrega com `yaml.safe_load` e lista os 5 jobs; actionlint indisponível. Pendente: o job `backend-e2e` só roda de verdade depois do push e depende dos scripts `typecheck:e2e` e `test:e2e` da T1. Revisão final do Saturno: aprovada. Pendência do CI resolvida: no PR #177 (run 45061194673), os 5 checks passaram; o `backend-e2e` passou em 33 s (`typecheck:e2e` ok; 6 arquivos e 29 testes em 4,29 s), igual ao resultado local, e `backend`, `gateway`, `backend-integration` e `frontend` também passaram.

### T5 [P] Documentação de como rodar o teste ponta a ponta
- O quê: explicar o que o teste cobre e como rodá-lo, localmente e no CI.
- Onde:
  - `src/backend/README.md`: seção "Organização dos testes" e a parte de como rodar;
  - `.docs/architecture/architecture.md`: a linha do CI.
- Dev: Plutão (dev-doc)
- Depende de: nada para escrever, porque os nomes dos scripts, do job, dos arquivos e as portas estão fixados aqui. A conferência final vem depois de T2, T3 e T4.
- Reaproveita: o texto atual sobre os testes de integração (banco separado e `npm run test:integration`).
- Atende: Critérios de sucesso (rodar localmente com um comando)
- Passos:
  1. Acrescentar a camada **Ponta a ponta** em "Organização dos testes":
     - `npm run test:e2e`, `vitest.e2e.config.mts` e `tests/e2e/`, em série;
     - Gateway e Backend no mesmo processo e a Meta interceptada;
     - a IA desligada.
  2. Explicar como rodar localmente:
     - `npm ci` no Gateway;
     - um Postgres descartável (o modelo do Plano de execução);
     - `db:migrate`, `typecheck:e2e` e `test:e2e`;
     - o aviso de nunca usar o banco do app, porque o teste troca a agenda e a configuração do WhatsApp e as restaura no fim.
  3. Atualizar a linha do CI em `architecture.md` com o job `backend-e2e`.
  4. Rodar o gate doc e commitar: `Docs :bulb: [#18] Documenta como rodar o teste ponta a ponta`.
- Pronto quando:
  - os comandos batem com `package.json` e `ci.yml`;
  - os links abrem;
  - não há valor de `.env` no texto.
- Teste: nenhum (documentação)
- Gate: doc
- Modelo: economico
- Status: feita (commit 5100d75). Evidência: não há formatador de docs para esses arquivos. Conferência final contra o código feita no commit ed1c51d (README do backend, com as 3 sugestões do Saturno aplicadas); pendência resolvida. Revisão final do Saturno: aprovada, incluindo ed1c51d.

## Dúvidas

Do product-owner:

- **D-PO-01 (resolvida):** o teste ponta a ponta não cobre as variações da regra RN-02 (pergunta que exige atendimento presencial e pergunta fora do escopo). Elas ficam em "Fora do escopo", cobertas pelos testes de unidade e de integração. Decisão da PO.
- **D-PO-02 (resolvida):** o cancelamento parte só de um agendamento Pendente, sem caso extra a partir de Confirmado, porque o resultado é o mesmo nos dois estados. A remarcação continua partindo de um Confirmado, para provar a volta a Pendente. Decisão do usuário, recomendada pela PO.

Só o usuário:

- **D-US-01 (resolvida):** a tabela de tipos de commit não tem um tipo para CI. O usuário decidiu usar `Build :rocket:` no commit do `ci.yml` (T4).
- **D-US-02 (resolvida):** para chegar ao "dia do atendimento" no CA-06, o usuário decidiu preparar a data no passado direto no banco, com `moveAppointmentToPast` (1 minuto atrás), sem relógio falso.

Riscos:

- **Agenda e relógio:** com antecedência de 1 dia e janela de 30 dias, sempre há horário livre, a qualquer hora em que o CI rode. Se a regra de antecedência ou de janela mudar, a agenda fixa do teste precisa acompanhar.
- **Banco compartilhado:** o e2e troca a agenda e a configuração do WhatsApp do banco inteiro. No CI ele tem um Postgres próprio. Localmente, rodar contra o banco do app ou junto com a integração no mesmo banco atrapalha os dois. Isso fica documentado em T5.
- **Duas cópias do Express:** Backend e Gateway carregam cada um o seu `node_modules`. Funciona, mas um erro de tipo cruzado aparece só no `typecheck:e2e`. Os `tsconfig.json` do Backend e do Gateway têm as mesmas opções estritas (conferido em 2026-11-22), então o `typecheck:e2e` não deve acusar erro no código do Gateway. Se acusar, isso é registrado como achado, e T1 não muda o Gateway.
- **Cache da configuração no Gateway (60 s):** se um teste mudar a configuração do WhatsApp que o Gateway lê (segredo ou token), o Gateway continua com a antiga. O contrato só muda o interruptor de aviso, que o Gateway não lê.
- **Contrato:** uma mudança de assinatura em T1 depois que Vênus começou atrasa T3. Toda mudança é registrada nesta spec antes de ser feita.
