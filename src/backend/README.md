# ProconChat — Backend

Backend do chatbot de orientação ao consumidor via WhatsApp (PROCON Jacareí). Express + TypeScript, seguindo o padrão Controller → Service → Route.

## Estrutura de pastas

- `app.ts` — monta a aplicação Express: middlewares globais (helmet, cors, json), validação de variáveis de ambiente, logger de requisição, rotas e o middleware de erro central. Não contém lógica de negócio.
- `index.ts` — ponto de entrada: sobe o servidor HTTP na porta configurada, trata `uncaughtException`/`unhandledRejection` e faz o encerramento gracioso do processo em `SIGTERM`/`SIGINT`.
- `routes/` — cada recurso tem uma classe `XRoutes` que cria o controller, registra os caminhos com `metodo.bind(controller)` e exporta o `Router` por `getRouter()` (ex.: `health.routes.ts`, `auth.routes.ts`).
- `controllers/` — cada controller é uma classe com as dependências injetadas pelo constructor (com valor padrão apontando para a instância já montada do service) e métodos `(req, res, next)`. Recebe a requisição HTTP, valida entrada básica, chama o service e formata a resposta (envelope `{ data }` ou erro via `next(error)`). Não acessa o banco diretamente.
- `services/` — contém a lógica de negócio de cada recurso, sem depender do objeto `Request`/`Response` do Express. O service é criado por fábrica (`createXService({ ... })`) e exporta uma instância já montada (ex.: `createAuthService` e `authService` em `auth.service.ts`). O `HealthService` em classe é a exceção histórica.
- `repositories/` — contratos e adaptadores de persistência; concentra o SQL e isola os services do PostgreSQL.
- `errors/` — hierarquia de erros da aplicação: `AppError` (abstrata) e subclasses por status HTTP (`BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `TooManyRequestsError`, `InvalidOriginError`, `InvalidCurrentPasswordError`, `InternalServerError`). Lançar/`next()` uma dessas classes é o jeito padrão de sinalizar um erro esperado.
- `middleware/` — middlewares do Express: `requestLogger.middleware.ts` (log estruturado por requisição, sem corpo nem cookies), `errorHandler.middleware.ts` (converte qualquer erro numa resposta JSON padronizada; corpo JSON malformado vira `400 BAD_REQUEST`), `trustedOrigin.middleware.ts` (proteção CSRF) e `auth.middleware.ts` (`requireAuth` e `requirePermission`).
- `types/` — DTOs e formatos de resposta compartilhados (`successResponse.types.ts`, `errorResponse.types.ts`, tipos específicos de cada recurso).
- `utils/` — utilitários que não pertencem a nenhum recurso específico, ex.: `validateEnv.ts` (validação de variáveis de ambiente obrigatórias na inicialização).
- `db/` — `connection.ts`, conexão genérica ao PostgreSQL (via `pg`). Ainda não é usada por nenhuma rota — fica pronta para o primeiro recurso real que precisar de acesso ao banco.

## Padrão para adicionar um novo recurso

- Service em fábrica: `services/<recurso>.service.ts` com `createXService({ ... })` e a instância padrão exportada.
- Controller em classe, como `controllers/health.controller.ts`, com as dependências no constructor (ex.: `controllers/auth.controller.ts`). Variáveis de ambiente são lidas na requisição, nunca no constructor.
- Rotas em classe, como `routes/health.routes.ts`, exportando o `Router` de `getRouter()`.
- Montagem em `app.ts`, sob o prefixo `/api/v1` (exceto casos como `/health`, que ficam fora do versionamento por serem consumidos por infraestrutura).
- Teste unitário do controller em `controllers/<recurso>.controller.test.ts`: instancia a classe com dublês, monta `req`/`res`/`next` falsos e chama os métodos direto, sem `supertest` (ex.: `controllers/auth.controller.test.ts`).
- Teste de montagem em `routes/<recurso>.routes.test.ts` com `supertest` contra o `app` exportado por `app.ts`, só para caminho, middlewares e ordem, CORS, CSRF, cabeçalhos e envelope de erro (ex.: `routes/health.routes.test.ts`).

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DB_URL` | Sim | String de conexão do PostgreSQL (`pg`). O servidor falha na inicialização com uma mensagem clara se ela não estiver definida. |
| `PORT` | Não (padrão `3000`) | Porta em que o servidor Express escuta. |
| `PHONE_HASH_SECRET` | Sim | Segredo HMAC usado para que o telefone nunca seja persistido em texto puro. |
| `GATEWAY_INTERNAL_TOKEN` | Sim | Token esperado no header `X-Internal-Token` das chamadas do Gateway WhatsApp (`src/gateway/`) a `POST /api/v1/whatsapp/sessions`. |
| `AUTH_TOKEN_SECRET` | Sim, com 32 ou mais caracteres | Segredo HS256 dos cookies de sessão do painel. O servidor encerra na inicialização sem ele ou com ele curto. Trocar derruba todas as sessões. |
| `FRONTEND_ORIGIN` | Não (padrão `http://localhost:5173`) | Origem do painel (esquema, host e porta), usada no CORS e na proteção CSRF. Precisa ser uma URL `http` ou `https`, senão o servidor encerra na inicialização. É normalizada na leitura com `new URL(valor).origin`: barra no fim, caminho e maiúsculas no esquema ou no host são descartados. No Compose local é `http://localhost:8081`; em produção, `https://<SITE_ADDRESS>`. |
| `ROOT_EMAIL` | Só no `seed`, enquanto não existe a conta Admin | E-mail da conta Admin criada pelo seed. |
| `ROOT_PASSWORD` | Só no `seed` (enquanto não existe Admin) e no `admin:reset-password` | Senha da conta Admin, de 8 caracteres a 72 bytes em UTF-8. |

## Como rodar

Para subir PostgreSQL com migrations automáticas e backend via Docker Compose,
consulte o [guia do banco de dados](../../.docs/database/migrations.md).

```bash
npm install
npm run dev     # sobe o servidor em modo desenvolvimento (nodemon + ts-node)
npm run build   # compila para dist/
npm start       # roda a versão compilada (dist/index.js)
npm test        # roda a suíte de testes (Vitest + Supertest)
```

Na raiz do repositório, o teste de integração usa o PostgreSQL do Compose e remove os próprios
dados ao terminar:

```bash
docker compose --profile test run --rm --build backend-tests
```

`GET /health` responde `200` com `{ "data": { "status": "ok" } }` e não depende do banco de dados — serve como healthcheck de infraestrutura (Docker, load balancer) e como exemplo do padrão de código para copiar em novos recursos.

`POST /api/v1/whatsapp/sessions` recebe `{ phone, text? }` do Gateway WhatsApp
(`src/gateway/`), autenticado pelo header `X-Internal-Token`, e cria ou reutiliza uma sessão
guardando somente o HMAC do telefone (nunca o número em texto puro).

## Autenticação do painel

Contas e permissões seguem a decisão 004. A sessão viaja **só** em cookies `HttpOnly`: nenhuma
resposta traz token no corpo, nenhum token chega ao JavaScript do navegador e o cabeçalho
`Authorization: Bearer` é ignorado.

### Cookies

| Cookie | Conteúdo | Atributos | Vida |
| --- | --- | --- | --- |
| `proconchat_access` | JWT HS256 `{ sub, sessionVersion, typ: "access" }` | `HttpOnly`, `SameSite=Strict`, `Path=/`, `Secure` com `NODE_ENV=production` | 1 hora |
| `proconchat_refresh` | JWT HS256 `{ sub, sessionVersion, typ: "refresh" }` | `HttpOnly`, `SameSite=Strict`, `Path=/api/v1/auth`, `Secure` com `NODE_ENV=production` | 90 dias a contar do login (ou da troca de senha), sem deslizar |

Um token do `typ` errado é recusado. As respostas de `/api/v1/auth` levam `Cache-Control: no-store`.
A imagem Docker roda com `NODE_ENV=production`, então os cookies saem `Secure` também no Compose
local. Chrome e Firefox aceitam cookie `Secure` em `http://localhost`; o **Safari não guarda**, então
use outro navegador para testar o painel local pelo Compose.

### Rotas

| Rota | Autenticação | Sucesso | Erros |
| --- | --- | --- | --- |
| `POST /api/v1/auth/login` `{ email, password }` | nenhuma | `200 { data: { user } }` + os dois cookies | `400 BAD_REQUEST` (inclusive e-mail com mais de 254 caracteres, sem contar os espaços nas pontas); `401 UNAUTHORIZED` (mensagem única para e-mail inexistente, senha errada ou conta inativa); `429 TOO_MANY_REQUESTS` com `Retry-After`; `403 INVALID_ORIGIN` |
| `POST /api/v1/auth/refresh` | cookie de refresh | `204` + novo cookie de acesso (o de refresh não muda) | `401 UNAUTHORIZED`, que limpa os dois cookies; `403 INVALID_ORIGIN` |
| `POST /api/v1/auth/logout` | nenhuma | `204`, que limpa os dois cookies sempre, sem mudar `session_version` | `403 INVALID_ORIGIN` |
| `GET /api/v1/auth/me` | cookie de acesso | `200 { data: { id, name, email, isAdmin, permissions } }` | `401 UNAUTHORIZED` |
| `POST /api/v1/auth/change-password` `{ currentPassword, newPassword }` | cookie de acesso | `200 { data: { changed: true } }` + os dois cookies reemitidos | `400 BAD_REQUEST`; `400 INVALID_CURRENT_PASSWORD`; `401`; `403 INVALID_ORIGIN` |

`user` tem o mesmo formato de `/auth/me`. O e-mail do login é comparado sem espaços nas pontas e em
minúsculas. Toda tentativa de login executa uma comparação bcrypt, inclusive quando o e-mail não
existe, para não revelar pelo tempo quais e-mails têm conta.

### Senhas e revogação

- Hash `bcryptjs` com custo 12. A senha tem de 8 caracteres a 72 bytes em UTF-8 (limite do bcrypt),
  no seed, na troca e no script de redefinição. Uma senha acima de 72 bytes nunca confere no login.
- A cada requisição, `requireAuth` confere a conta ativa (`active`) e a `session_version` gravada no
  token. **Trocar a senha incrementa `session_version`**: as outras sessões caem, inclusive no
  refresh, e a sessão atual recebe cookies novos. **Sair não incrementa**: só limpa os cookies do
  navegador.
- **Derrubar todas as sessões de todas as contas:** troque `AUTH_TOKEN_SECRET` e recrie o container
  do backend (`docker compose up -d backend` no ambiente local,
  `docker compose -f compose.prod.yaml up -d backend` em produção). O `docker compose restart` não
  relê o `.env`: o backend continua com o segredo antigo e as sessões continuam valendo.

### Rotas do painel: `requireAuth` e `requirePermission`

```ts
router.get("/", requireAuth, requirePermission("appointments.view"), listAppointments)
```

- Sem cookie de acesso válido: `401 UNAUTHORIZED`. Sem a permissão: `403 FORBIDDEN`.
- As 8 chaves (`types/auth.types.ts`, `.docs/database/database.md`): `appointments.view`,
  `appointments.manage`, `content.manage`, `schedule.configure`, `documents.configure`,
  `sessions.view`, `reports.view`, `users.manage`.
- Na Sprint 2 só a conta Admin (`is_admin`) recebe as 8. As permissões das outras contas são da #62.

### CSRF e CORS

- `requireTrustedOrigin` é montado em `/api/v1` depois de `POST /api/v1/whatsapp/sessions` (servidor a
  servidor, sem cookie) e antes de `/api/v1/auth`. **Toda rota nova sob `/api/v1` herda a
  verificação** sem precisar lembrar dela.
- Em `POST`, `PUT`, `PATCH` e `DELETE`, o `Origin` precisa ser igual a `FRONTEND_ORIGIN`. Sem `Origin`,
  vale a origem do `Referer`. Sem os dois, ou com outro valor, a resposta é `403 INVALID_ORIGIN`, antes
  da rota e do limitador. Por isso `curl` e scripts que mudam estado precisam mandar
  `-H "Origin: <FRONTEND_ORIGIN>"`.
- Desvio aceito: o `express.json()` roda antes de `requireTrustedOrigin`, então um corpo JSON
  malformado vindo de outra origem recebe `400 BAD_REQUEST` em vez de `403 INVALID_ORIGIN`, sem
  chegar a nenhuma rota.
- `GET`, `HEAD` e `OPTIONS` não passam pela verificação. **Uma rota `GET` nunca pode mudar estado.**
- CORS só libera `FRONTEND_ORIGIN`, com `credentials: true`. Outra origem não recebe
  `Access-Control-Allow-Origin`.
- Limite: o `HttpOnly` impede que um XSS no painel **leia** o token, mas não que ele faça requisições
  como o usuário enquanto a página está aberta. A defesa é não ter XSS no painel.

### Limitador de tentativas

- 5 falhas em 15 minutos pelo par IP + e-mail bloqueiam esse par por 15 minutos, mesmo com a senha
  certa. 20 falhas em 15 minutos de um IP, em qualquer e-mail, bloqueiam o IP. A resposta é `429`
  com `Retry-After` em segundos. Um login certo zera o contador do par.
- O IP é o do cliente: `app.set("trust proxy", 1)` confia no `X-Forwarded-For` posto pelo Caddy. Em
  produção o backend não publica porta. No `npm run dev` o cabeçalho pode ser forjado.
- Os contadores ficam em memória: zeram quando o processo reinicia e valem para uma instância só.

### Conta Admin e redefinição da senha

- O `seed` cria a conta Admin (`name = 'Admin'`, `is_admin`) a partir de `ROOT_EMAIL` e
  `ROOT_PASSWORD` só se ela ainda não existe (detalhes em `db/seeds/README.md`).
- Não existe "esqueci minha senha" (decisão 004, item 8). Para redefinir a senha do Admin, troque
  `ROOT_PASSWORD` e rode:

  ```bash
  npm run admin:reset-password
  docker compose run --rm seed node dist/db/scripts/resetAdminPassword.js
  ```

  A primeira linha é para o ambiente local com `DB_URL`; a segunda, para o Compose. O script grava o
  novo hash, incrementa `session_version` e registra `Senha do Admin redefinida`, sem e-mail nem
  senha. Sem conta Admin, sai com código 1 e pede para rodar o seed. Em produção, veja
  `.docs/infra/deploy.md`.

## Eventos da conversa

Os passos da conversa ficam em `ConversationEvents` (RF06, decisão 010) e o desfecho fica em
`Sessions.outcome` (decisão 008). O contrato completo está em `types/conversationEvent.types.ts`.
Nenhum evento guarda texto digitado pelo cidadão (RNF03): só tipos, ids e valores de lista fechada.

### Pontos de escrita

| Função | Arquivo | Uso |
| --- | --- | --- |
| `conversationEventService.record(sessionId, event)` | `services/conversationEvent.service.ts` | Evento comum de um passo. Nunca lança (ver "Falhas de gravação") |
| `conversationEventService.finish(sessionId, { outcome, event })` | `services/conversationEvent.service.ts` | Encerramento fora de transação. Abre a própria transação e lança se falhar |
| `finishSessionWith(client, sessionId, { outcome, event })` | `repositories/session.repository.ts` | Encerramento dentro da transação de outro repositório (reserva da #56, remarcação e cancelamento da #59). Lança e não desfaz nada: quem abriu a transação faz o `ROLLBACK` |
| `insertConversationEvent(client, sessionId, event)` | `repositories/conversationEvent.repository.ts` | Evento comum dentro de uma transação aberta |
| `conversationEventService.listBySession(sessionId)` | `services/conversationEvent.service.ts` | Leitura tipada, em ordem cronológica, com `createdAt`, para a linha do tempo (#60, #72, #86). Chaves desconhecidas vindas do banco são descartadas. Uma linha fora do contrato é descartada e registrada no log, sem derrubar a lista (ver "Leitura") |

`insertConversationEvent` e `finishSessionWith` são o **único** caminho de escrita em
`ConversationEvents` e de encerramento de sessão, com uma exceção: o evento `ABANDONED` e o abandono
da sessão são gravados pela CTE de `findOrCreateActive` em `repositories/session.repository.ts`,
direto em SQL e sem passar pelo validador da aplicação. Esse evento é protegido só pelos `CHECK` da
migration `13` (`chk_conversation_events_data_keys` e `chk_conversation_events_data_values` no `data`,
`chk_sessions_step_finished` e `chk_sessions_abandoned_step_not_finished` na etapa copiada). O teste `repositories/conversationEventWriters.test.ts`
falha se aparecer `INSERT INTO ConversationEvents` fora de `conversationEvent.repository.ts` e
`session.repository.ts`, ou `UPDATE Sessions ... status = 'FINISHED'` fora de `session.repository.ts`.
O `STARTED` é gravado pelo próprio `findOrCreateActive`, na transação que cria a sessão; nenhum fluxo
grava `STARTED`.

### Tipos e dados persistidos

| Tipo | Campos do evento | Colunas | `data` gravado |
| --- | --- | --- | --- |
| `STARTED` | — | — | `{}` |
| `CATEGORY_CHOSEN` | `categoryId` | `category_id` | `{}` |
| `QUESTION_CHOSEN` | `categoryId`, `questionId` | `category_id`, `question_id` | `{}` |
| `ANSWER_SENT` | `categoryId`, `questionId`, `llm` | `category_id`, `question_id` | `{ "llm": "NOT_CALLED" \| "USED" \| "FAILED" }` |
| `RESOLVED_ANSWERED` | `resolved` | — | `{ "resolved": true \| false }` |
| `SCHEDULE_OFFERED` | `reason` | — | `{ "reason": "REQUIRES_IN_PERSON" \| "NOT_RESOLVED" }` |
| `NO_SLOT`, `SCHEDULE_DECLINED`, `PHONE_NOTICE_SHOWN` | — | — | `{}` |
| `ATTENDEE_CHOSEN` | `byRepresentative` | — | `{ "by_representative": true \| false }` |
| `APPOINTMENT_CREATED`, `APPOINTMENT_CONSULTED`, `APPOINTMENT_CANCELED` | `appointmentId` | `appointment_id` | `{}` |
| `APPOINTMENT_RESCHEDULED` | `appointmentId`, `from`, `to` | `appointment_id` | `{ "from": "<ISO 8601>", "to": "<ISO 8601>" }` |
| `ABANDONED` | `step` | — | `{ "step": "<session_step>" }` |

O `llm` vem do campo `status` devolvido por `services/llmExplicacao.service.ts`: `NOT_CALLED` quando
a pergunta é fora do escopo e o cliente não é chamado, `USED` quando o Ollama respondeu e `FAILED`
em qualquer falha do cliente (timeout, HTTP, corpo malformado, rede). Enquanto a #66 não liga o LLM
ao fluxo, o fluxo grava `NOT_CALLED`.

### Validação

Antes de qualquer consulta, `buildConversationEventRow` (`utils/conversationEventData.ts`) recusa com
`InternalServerError`:

- `type` fora dos 15 valores e qualquer chave a mais no objeto do evento;
- id que não é inteiro positivo seguro (`0`, negativo, fracionário ou em texto) e `sessionId` que não
  é texto só de dígitos;
- `llm`, `reason` ou `step` fora da lista (`step` nunca é `FINISHED`);
- `resolved` e `byRepresentative` que não são booleanos (`"true"` é recusado);
- `from` e `to` que não são data ISO 8601 válida com fuso (`Z` ou `±hh:mm`): o dia tem que existir no
  mês (`2026-02-31` é recusado), a hora vai até `23`, e minuto e segundo até `59` (`24:00` é recusado).

A mensagem do erro nunca repete o valor recebido. Os ids que o Postgres devolve como texto (`BIGINT`)
precisam ser convertidos com `Number(...)` antes de entrar no evento.

No banco, a migration `13_conversation_events_data_checks.sql` cria `chk_conversation_events_data_keys`
(só as chaves da tabela acima, por tipo) e `chk_conversation_events_data_values` (listas fechadas de
`llm`, `reason` e `step`, booleanos com `jsonb_typeof = 'boolean'` e `from`/`to` em texto no formato
ISO 8601 com fuso). Um `INSERT` por fora do contrato falha com `23514`. O banco confere só o formato
de `from`/`to`; a data de calendário e a hora válidas são conferidas pela aplicação.

### Leitura

O `CHECK` da `13` limita as chaves e os valores de `data`, mas não exige as chaves de cada tipo: um
`ANSWER_SENT` gravado por fora com `data = {}` passa no banco. `listBySession`
(`repositories/conversationEvent.repository.ts`) valida cada linha com `parseConversationEventRow` e,
se uma linha estiver fora do contrato (tipo desconhecido, campo obrigatório ausente ou valor fora da
lista), **descarta só essa linha** e devolve as outras na ordem. O descarte vai para o log com
`{ type, sessionId, code }`: o tipo do contrato (ou `INVALID`), o id da sessão e o código do erro
(`INTERNAL_SERVER_ERROR`). O log nunca leva `data` nem o valor recebido. Falha da consulta continua
lançando.

### Encerramento coerente com a decisão 008

O encerramento grava o evento de fechamento e faz um único `UPDATE Sessions` com `status = 'FINISHED'`,
`outcome`, `ended_at`, `last_interaction_at`, `current_step = 'FINISHED'` e `draft = NULL`, só se a
sessão ainda estiver `IN_PROGRESS`. Se nenhuma linha mudar, lança, e a transação volta com o evento.
O par desfecho e evento tem que casar, senão lança `InternalServerError` sem consultar o banco:

| Desfecho | Evento de fechamento aceito |
| --- | --- |
| `RESOLVED` | `RESOLVED_ANSWERED` com `resolved: true`. Provisoriamente também `ANSWER_SENT`, enquanto o fluxo da Sprint 1 não pergunta "A dúvida foi resolvida?". **A #55 remove essa exceção** em `isClosingCompatible` (`utils/conversationEventData.ts`) |
| `SCHEDULED` | `APPOINTMENT_CREATED` |
| `OUT_OF_SCOPE` | `ANSWER_SENT` |
| `NO_SLOT` | `NO_SLOT` |
| `DECLINED` | `SCHEDULE_DECLINED` |
| `MANAGED_APPOINTMENT` | `APPOINTMENT_RESCHEDULED` ou `APPOINTMENT_CANCELED` |

`ABANDONED` não é desfecho de encerramento: só o timeout grava.

### Chamada por passo

| Passo | Issue | Chamada | Evento | Desfecho |
| --- | --- | --- | --- | --- |
| Sessão criada | #16 (automático) | `findOrCreateActive` | `STARTED` | — |
| Categoria escolhida | #55 | `record` | `CATEGORY_CHOSEN` | — |
| Pergunta escolhida | #55 | `record` | `QUESTION_CHOSEN` | — |
| Resposta entregue | #55 / #66 (`llm`) | `record`, ou `finish` se fora do escopo | `ANSWER_SENT` | `OUT_OF_SCOPE` |
| "A dúvida foi resolvida?" | #55 | `record` (Não) ou `finish` (Sim) | `RESOLVED_ANSWERED` | `RESOLVED` |
| Agendamento oferecido | #55 | `record` | `SCHEDULE_OFFERED` | — |
| Recusou agendar | #55 | `finish` | `SCHEDULE_DECLINED` | `DECLINED` |
| Quem comparece | #56 | `record` | `ATTENDEE_CHOSEN` | — |
| Sem horário | #56 | `finish` | `NO_SLOT` | `NO_SLOT` |
| Aviso de mensagens neste número | #56 | `record` | `PHONE_NOTICE_SHOWN` | — |
| Agendamento criado | #56 | `finishSessionWith(client, ...)` na transação da reserva; se falhar, a reserva volta e o cidadão é avisado | `APPOINTMENT_CREATED` | `SCHEDULED` |
| Consultou agendamento | #59 | `record` | `APPOINTMENT_CONSULTED` | — |
| Remarcou / cancelou | #59 | `finishSessionWith(client, ...)` na transação da alteração; se falhar, a alteração volta e o cidadão é avisado | `APPOINTMENT_RESCHEDULED` / `APPOINTMENT_CANCELED` | `MANAGED_APPOINTMENT` |
| 30 min sem interação | #16 na próxima mensagem do mesmo número; #55 na varredura periódica | — | `ABANDONED` | `ABANDONED` |

Hoje o fluxo da Sprint 1 encerra a resposta com `finish` e `ANSWER_SENT` (`llm: "NOT_CALLED"`):
`OUT_OF_SCOPE` para pergunta fora do escopo e `RESOLVED` (exceção provisória) para as demais.

### Encerramento dentro de uma transação

A reserva (#56) e a remarcação ou o cancelamento (#59) gravam o agendamento, o evento e o desfecho
na mesma transação, sem `INSERT` direto em `ConversationEvents`:

```ts
const client = await getPool().connect()
try {
    await client.query("BEGIN")
    const appointmentId = await insertAppointment(client, reservation)
    await finishSessionWith(client, sessionId, {
        outcome: "SCHEDULED",
        event: { type: "APPOINTMENT_CREATED", appointmentId },
    })
    await client.query("COMMIT")
} catch (error) {
    await client.query("ROLLBACK")
    throw error
} finally {
    client.release()
}
```

### Falhas de gravação

| Situação | Comportamento |
| --- | --- |
| Falha ao gravar evento comum com `record` (categoria, pergunta, resposta enviada, "resolveu?", oferta, quem comparece etc.), inclusive evento recusado pelo validador | `record` captura o erro, registra no log só o tipo do evento (ou `INVALID`), o id da sessão (ou `INVALID`) e o código do erro, e resolve normalmente. O cidadão recebe a resposta |
| Encerramento do fluxo atual (`RESOLVED`/`OUT_OF_SCOPE` com `ANSWER_SENT`) | `finish` lança. O fluxo registra no log do mesmo jeito e entrega a resposta; a sessão continua `IN_PROGRESS`, sem evento de fechamento, e será abandonada pelo timeout |
| Criação do agendamento e encerramentos ligados a ele (`APPOINTMENT_CREATED`/`SCHEDULED`, `APPOINTMENT_RESCHEDULED`/`APPOINTMENT_CANCELED`/`MANAGED_APPOINTMENT`) | `finishSessionWith(client, ...)` na mesma transação da reserva ou da alteração. Se a reserva, o evento ou o encerramento falhar, a transação inteira volta e o cidadão recebe uma mensagem clara de que o agendamento **não** foi gravado. A mensagem e o tratamento são do fluxo da #56 (e da #59 no retorno) |

O log nunca leva `data`, texto do cidadão, telefone nem `draft`.

### Abandono

Na transação de `findOrCreateActive`, a sessão do mesmo número em andamento com
`last_interaction_at <= now() - interval '30 minutes'` recebe, num único `UPDATE`:
`status = 'ABANDONED'`, `outcome = 'ABANDONED'`, `abandoned_at_step = current_step`,
`current_step = 'FINISHED'`, `draft = NULL` e `ended_at = last_interaction_at + interval '30 minutes'`.
O `last_interaction_at` **não** muda. O evento `ABANDONED` com `{ "step": <etapa> }` é gravado na
mesma transação, e só então a sessão nova é criada (com o seu `STARTED`).

A migration `13` garante no banco que `current_step = 'FINISHED'` só existe em sessão encerrada
(`chk_sessions_step_finished`) e que `abandoned_at_step` nunca é `FINISHED`
(`chk_sessions_abandoned_step_not_finished`). Assim a etapa copiada pelo abandono é sempre uma
`AWAITING_*`, e `ActiveSession.currentStep` e `NavigationState.currentStep` são
`Exclude<SessionStep, "FINISHED">`.

Esta regra só roda quando o mesmo número volta a escrever. A **varredura periódica** das sessões de
quem nunca volta é da **#55** e precisa aplicar exatamente a mesma regra. A correspondência entre
etapa e os nomes de abandono dos Relatórios é da #68.

### O que cada branch troca no merge

- **#55** (`feat/55-novo-fluxo-da-duvida`): fica com a versão da #16 de `findOrCreateActive` e de
  `finish`, apaga o abandono próprio, faz a varredura reaproveitando a regra acima, emite os eventos
  da tabela por passo com `record`/`finish` e remove a exceção provisória do `RESOLVED` em
  `isClosingCompatible`.
- **#56** (`feat/56-bot-agendamento-presencial`): troca o `INSERT` direto em `ConversationEvents` e o
  `UPDATE Sessions` da reserva (`schedule.repository.ts`) por `finishSessionWith(client, ...)` com
  `APPOINTMENT_CREATED`/`SCHEDULED`, e avisa o cidadão quando a transação falhar.
- **#60** (`feat/60-api-agendamentos`): lê a linha do tempo da conversa de origem com `listBySession`
  em vez de consultar `ConversationEvents` em `appointment.repository.ts`, fica com a versão da #16 de
  `session.repository.ts` e aplica a mesma troca da #56 no `schedule.repository.ts` que carrega.
