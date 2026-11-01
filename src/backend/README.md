# ProconChat — Backend

Backend do chatbot de orientação ao consumidor via WhatsApp (PROCON Jacareí). Express + TypeScript, em camadas Route → Controller → Service → Repository.

## Estrutura de pastas

- `app.ts` — monta a aplicação Express: middlewares globais (helmet, cors, json), validação de variáveis de ambiente, logger de requisição, rotas e o middleware de erro central. Não contém lógica de negócio.
- `index.ts` — ponto de entrada: sobe o servidor HTTP na porta configurada, trata `uncaughtException`/`unhandledRejection` e faz o encerramento gracioso do processo em `SIGTERM`/`SIGINT`.
- `routes/` — cada recurso tem uma classe `XRoutes` que cria o controller, registra os caminhos com `metodo.bind(controller)` e exporta o `Router` por `getRouter()` (ex.: `health.routes.ts`, `auth.routes.ts`).
- `controllers/` — cada controller é uma classe com as dependências injetadas pelo constructor (com valor padrão apontando para a instância já montada do service) e métodos `(req, res, next)` (ex.: `auth.controller.ts`, `whatsappSession.controller.ts`; o `health.controller.ts` não recebe dependências). Recebe a requisição HTTP, valida entrada básica, chama o service e formata a resposta (envelope `{ data }` ou erro via `next(error)`). Não acessa o banco diretamente.
- `services/` — contém a lógica de negócio de cada recurso, sem depender do objeto `Request`/`Response` do Express. O service é criado por fábrica (`createXService({ ... })`) e exporta uma instância já montada (ex.: `createAuthService` e `authService` em `auth.service.ts`). O `HealthService` em classe é a exceção histórica.
- `repositories/` — contratos e adaptadores de persistência; concentra o SQL e isola os services do PostgreSQL.
- `errors/` — hierarquia de erros da aplicação: `AppError` (abstrata) e subclasses por status HTTP (`BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `TooManyRequestsError`, `InvalidOriginError`, `InvalidCurrentPasswordError`, `WhatsAppConnectionError`, `InternalServerError`), mais os quatro erros da reserva do bot (`SlotFullError`, `DuplicateAppointmentError`, `BookingFailedError`, `ScheduleNotConfiguredError`). Cada arquivo exporta a classe só como `default`. Lançar/`next()` uma dessas classes é o jeito padrão de sinalizar um erro esperado.
- `middleware/` — middlewares do Express: `requestLogger.middleware.ts` (log estruturado por requisição, sem corpo nem cookies), `errorHandler.middleware.ts` (converte qualquer erro numa resposta JSON padronizada; corpo JSON malformado vira `400 BAD_REQUEST`), `trustedOrigin.middleware.ts` (proteção CSRF), `auth.middleware.ts` (`requireAuth` e `requirePermission`) e `validateRequest.middleware.ts` (`validateRequest({ query, params, body })`, que valida com zod, troca `req.query`/`req.params`/`req.body` pelo valor validado e devolve `400 BAD_REQUEST` com `Dados inválidos: ...`).
- `types/` — DTOs e formatos de resposta compartilhados (`successResponse.types.ts`, `errorResponse.types.ts`, tipos específicos de cada recurso).
- `utils/` — utilitários que não pertencem a nenhum recurso específico, ex.: `validateEnv.ts` (validação de variáveis de ambiente obrigatórias na inicialização).
- `db/` — `connection.ts`, com o `getPool()` que devolve o único `Pool` do PostgreSQL (via `pg`), usado por todos os repositórios de `repositories/` que acessam o banco. Também guarda as migrations (`migrations/`), o schema consolidado (`schema/`), o seed (`seeds/`), os scripts de manutenção (`scripts/`) e o `verify-migrations.cjs` (`npm run test:db`).

## Padrão para adicionar um novo recurso

- Service em fábrica: `services/<recurso>.service.ts` com `createXService({ ... })` e a instância padrão exportada.
- Controller em classe, com as dependências injetadas pelo constructor e valor padrão apontando para a instância do service, como `controllers/auth.controller.ts` ou `controllers/whatsappSession.controller.ts`. O `controllers/health.controller.ts` serve só de modelo de formato (classe, campo `private`, `export default` no fim) e não injeta nada. Variáveis de ambiente são lidas na requisição, nunca no constructor.
- Rotas em classe, como `routes/health.routes.ts`, exportando o `Router` de `getRouter()`.
- Entrada validada na rota com os schemas zod de `schemas/<recurso>.schema.ts` e `validateRequest` (`middleware/validateRequest.middleware.ts`), como `routes/appointment.routes.ts`. O controller lê `req.query`/`req.params`/`req.body` já validados, sem validar de novo.
- Montagem em `app.ts`, sob o prefixo `/api/v1` (exceto casos como `/health`, que ficam fora do versionamento por serem consumidos por infraestrutura).
- Teste unitário do controller em `controllers/<recurso>.controller.test.ts`: instancia a classe com dublês, monta `req`/`res`/`next` falsos e chama os métodos direto, sem `supertest` (ex.: `controllers/auth.controller.test.ts`).
- Teste de montagem em `routes/<recurso>.routes.test.ts` com `supertest` contra o `app` exportado por `app.ts`, principalmente para caminho, middlewares e ordem, CORS, CSRF, cabeçalhos e envelope de erro (ex.: `routes/health.routes.test.ts`). A exceção são os testes de agendamentos (desde a #60): `routes/appointment.routes.test.ts` monta um `express()` próprio com `AppointmentRoutes` (o dublê enxuto `AppointmentRepositoryStub` e `createRequireAuth` com dublês) e o `errorHandler`, sem a proteção de origem; `routes/appointment.contract.test.ts` monta o mesmo e acrescenta `createRequireTrustedOrigin`. Temas maiores ficam em arquivos irmãos `routes/<recurso>.<tema>.test.ts` (ex.: `auth.endpoints`, `auth.loginLimiter`, `auth.sessionLifetime`, `auth.frontendOrigin`). O dublê de uma dependência num teste de rota entra por `vi.mock` ou por injeção no constructor, não por `vi.spyOn` na exportação do módulo, porque o controller guarda o service padrão quando é construído.

## Organização dos testes

- **Unidade** (`npm test`, `vitest.config.mts`): arquivos `*.test.ts` ao lado do código testado. Um assunto grande vira arquivos irmãos `<recurso>.<tema>.test.ts`, como `routes/auth.*.test.ts` e `services/conversationFlow.service.test.ts` (dúvida), `conversationFlow.scheduling.test.ts`, `conversationFlow.fullFlow.test.ts` e `conversationFlow.paused.test.ts`. O contrato da API de agendamentos tem o próprio arquivo, `routes/appointment.contract.test.ts`, que fixa as chaves exatas de cada resposta.
- **Dublês de repositório** em `repositories/mock/` (`*Mock.repository.ts`), como `InMemorySessionRepository` (`sessionMock.repository.ts`, com a mesma regra de página do repositório real e teste próprio). Os agendamentos usam o `AppointmentRepositoryStub` (`appointmentStub.repository.ts`, com teste próprio), um dublê enxuto sem semântica de SQL: devolve a lista e os detalhes do cenário sem filtrar, ordenar, contar nem paginar, guarda as chamadas (`findListCalls`, `actionCalls`), recusa as ações pelo `decideTransition` real e aplica o efeito que o próprio teste descreve (`afterAction`). Os dados vêm dos builders de `appointment.builders.ts` (`buildAppointmentDetail`, `buildListItem`, `buildChipCounts`, a linha do tempo da conversa e o relógio fixo `FIXED_NOW`).
- **Fixtures e harness dos services** em `services/mock/`: `conversationFlow.fixtures.ts` e `schedule.fixtures.ts` (dados e builders, sem `vitest`) e `conversationFlowHarness.ts` (o fluxo da conversa montado com `vi.fn`). Essas pastas entram no `dist`, porque o build só exclui `*.test.ts` e `tests/**`; código de produção nunca importa delas.
- **Integração** (`npm run test:integration`, `vitest.integration.config.mts`, em série): `tests/integration/*.test.ts` contra Postgres real, com os apoios em `tests/integration/helpers/` (`scheduleDb.ts`, `appointmentsDb.ts` e `phone.ts`). A busca, os filtros, a ordenação, os chips, o contador de pendentes e as transições do repositório de agendamentos são provados aqui, em `appointments.integration.test.ts`, e não na unidade. A pasta `tests/` inteira fica fora do build (`exclude` do `tsconfig.json`), então esses apoios, que apagam e recriam dados, não vão para o `dist` nem para a imagem.
- **Limpeza das observações internas:** o trigger `trg_appointment_notes_immutable` recusa `DELETE` em `AppointmentNotes`, e as chaves estrangeiras não têm cascata. Por isso `deleteAppointmentNotes` (`tests/integration/helpers/appointmentsDb.ts`, chamado por `deleteAppointmentScope`) desliga o trigger, apaga as observações e religa o trigger dentro de uma transação. `ALTER TABLE ... DISABLE TRIGGER` exige que o usuário do `DB_URL` seja dono da tabela (ou superusuário, como o `proconchat` do Docker e do CI) e pega `ACCESS EXCLUSIVE` em `AppointmentNotes` até o fim da transação. É mais um motivo para os testes de integração rodarem em série (`fileParallelism: false`) e num banco próprio, nunca no banco em uso pelo app.
- **Tipos dos testes:** o build não compila os testes nem `tests/`. `npm run typecheck:test` (`tsconfig.test.json`) checa os tipos de todo `.ts`, inclusive os testes, e roda no CI.

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DB_URL` | Sim | String de conexão do PostgreSQL (`pg`). O servidor falha na inicialização com uma mensagem clara se ela não estiver definida. |
| `PORT` | Não (padrão `3000`) | Porta em que o servidor Express escuta. |
| `PHONE_HASH_SECRET` | Sim | Segredo HMAC usado para que o telefone nunca seja persistido em texto puro. |
| `CPF_HASH_SECRET` | Sim | Segredo HMAC usado para que o CPF nunca seja persistido em texto puro ou em hash sem segredo. |
| `GATEWAY_INTERNAL_TOKEN` | Sim | Token esperado no header `X-Internal-Token` das chamadas do Gateway WhatsApp (`src/gateway/`) a `POST /api/v1/whatsapp/sessions`. |
| `AUTH_TOKEN_SECRET` | Sim, com 32 ou mais caracteres | Segredo HS256 dos cookies de sessão do painel. O servidor encerra na inicialização sem ele ou com ele curto. Trocar derruba todas as sessões. |
| `FRONTEND_ORIGIN` | Não (padrão `http://localhost:5173`) | Origem do painel (esquema, host e porta), usada no CORS e na proteção CSRF. Precisa ser uma URL `http` ou `https`, senão o servidor encerra na inicialização. É normalizada na leitura com `new URL(valor).origin`: barra no fim, caminho e maiúsculas no esquema ou no host são descartados. No Compose local é `http://localhost:8081`; em produção, `https://<SITE_ADDRESS>`. |
| `ENCRYPTION_KEY` | Sim, exatamente 64 caracteres hexadecimais | Chave-mestra AES-256-GCM dos segredos guardados no banco (`utils/crypto.utils.ts`, formato `v1:<iv>:<tag>:<cifrado>`). Também cifra o telefone do agendamento (`Appointments.phone_encrypted`), gravado pela reserva do bot. Gere com `openssl rand -hex 32`. O servidor encerra na inicialização sem ela ou fora do formato, e o `seed` falha se precisar cifrar algo sem ela. Não tem valor padrão em nenhum Compose: sem ela no `.env`, o `docker compose` recusa subir. |
| `PUBLIC_BASE_URL` | Não | URL pública do sistema (`http` ou `https`), usada para montar a URL do webhook mostrada na tela de WhatsApp (`<PUBLIC_BASE_URL>/webhooks/whatsapp`). Sem ela, a leitura devolve `webhookUrl: null`. Vazia conta como ausente. Em produção é `https://<SITE_ADDRESS>`; no desenvolvimento, a URL do túnel HTTPS (README do gateway). |
| `GATEWAY_INTERNAL_URL` | Não | Endereço interno do gateway (`http` ou `https`), avisado depois que o Admin salva a configuração do WhatsApp para recarregar sem reiniciar. Sem ela, o aviso não é enviado e o gateway recarrega pelo TTL de 60 s. No Compose é `http://gateway:3001`. |
| `WHATSAPP_GRAPH_API_VERSION` | Não (padrão `v26.0`) | Versão da Graph API da Meta no formato `v26.0`, usada no teste de conexão e repassada ao gateway pelo endpoint interno. Fora do formato, o servidor encerra na inicialização. |
| `ROOT_EMAIL` | Só no `seed`, enquanto não existe a conta Admin | E-mail da conta Admin criada pelo seed. |
| `ROOT_PASSWORD` | Só no `seed` (enquanto não existe Admin) e no `admin:reset-password` | Senha da conta Admin, de 8 caracteres a 72 bytes em UTF-8. |
| `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID` | Não; só no `seed`, enquanto `WhatsAppSettings` está vazia | IDs da Meta para a configuração inicial do WhatsApp. Preenchidos, só dígitos, até 40; senão o `seed` falha. |
| `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET` | Não; só no `seed`, enquanto `WhatsAppSettings` está vazia | Segredos iniciais, gravados cifrados com `ENCRYPTION_KEY`. |
| `WHATSAPP_VERIFY_TOKEN` | Não; só no `seed`, enquanto `WhatsAppSettings` está vazia | Token de verificação do webhook, de 1 a 64 caracteres visíveis sem espaço. Vazio, o `seed` gera um aleatório. |
| `OLLAMA_URL` | Não (padrão `http://ollama:11434`) | Endereço do Ollama usado por `clients/ollamaLlm.client.ts`. |
| `LLM_MODEL` | Não (padrão `llama3.2:3b`) | Modelo do Ollama. |
| `LLM_TIMEOUT_MS` | Não (padrão `20000`) | Tempo limite da chamada ao Ollama, em milissegundos. |
| `NODE_ENV` | Não | Com `production`, os cookies de sessão saem com `Secure` (seção "Cookies"). A imagem Docker já define `production`. |

## Como rodar

Para subir PostgreSQL com migrations automáticas e backend via Docker Compose,
consulte o [guia do banco de dados](../../.docs/database/migrations.md).

```bash
npm install
npm run dev     # sobe o servidor em modo desenvolvimento (nodemon + ts-node)
npm run build   # compila para dist/
npm start       # roda a versão compilada (dist/index.js)
npm test        # roda a suíte de testes (Vitest + Supertest)
npm run typecheck:test  # checa os tipos de todo o código, inclusive dos testes
```

Rode `npm run test:integration` num **banco separado**, com as migrations aplicadas. A integração
passa com ou sem o seed (o CI roda sem). O banco precisa ser separado porque o teste da configuração
do WhatsApp (#83) apaga a linha de `WhatsAppSettings` durante a execução e a restaura no fim, e os
testes da agenda trocam a configuração de horários e a restauram no fim; se a execução for
interrompida, esses dados do banco usado podem ficar perdidos. Por exemplo, com o Postgres do
Compose:

```bash
docker compose exec postgres psql -U proconchat -d proconchat -c "CREATE DATABASE proconchat_test"
export DB_URL=postgresql://proconchat:<POSTGRES_PASSWORD>@localhost:5433/proconchat_test
npm run db:migrate
npm run test:integration
```

Os testes de integração da agenda (`schedule.integration.test.ts`) e da API de agendamentos
(`appointments.integration.test.ts`) não dependem do conteúdo do banco e também passam num banco com
o seed. O da agenda guarda `ScheduleSettings`, `ScheduleRanges` e `BlockedDates`, troca pela
configuração do teste e restaura as três tabelas com os mesmos `id`s no fim (`snapshotScheduleConfig`
e `restoreScheduleConfig` em `tests/integration/helpers/scheduleDb.ts`). Os dois apagam o que
criam (categorias, perguntas, sessões com os seus eventos, agendamentos e usuários de teste); o da API
usa o Admin que já existe ou cria um "Admin Teste" e o apaga no fim. Se a execução for interrompida, a configuração da agenda
pode ficar trocada: rode num banco descartável, como acima.

`npm run test:db` (`db/verify-migrations.cjs`) cria bancos temporários a partir de `DB_TEST_URL` (o
usuário precisa de `CREATEDB`) e roda as migrations e o seed em processos filhos. Para provar que o
seed falha sem `ROOT_EMAIL`/`ROOT_PASSWORD`, o verificador tira essas variáveis do ambiente do filho.
Como `db/connection.ts` chama `dotenv.config()`, um `src/backend/.env` local devolveria as credenciais
apagadas e a checagem passaria ou falharia errado. Por isso o verificador passa `SKIP_DOTENV=true` aos
processos filhos, e `db/connection.ts` não carrega o `.env` quando recebe essa flag. Ela é só do
`test:db`: não entra no `validateEnv`, nos `.env.example` nem no `compose.yaml`.

`GET /health` responde `200` com `{ "data": { "status": "ok" } }` e não depende do banco de dados — serve como healthcheck de infraestrutura (Docker, load balancer) e como exemplo do padrão de código para copiar em novos recursos.

`POST /api/v1/whatsapp/sessions` recebe `{ phone, text?, optionId? }` do Gateway WhatsApp (`text` para mensagem digitada, `optionId` para toque numa lista ou botão)
(`src/gateway/`), autenticado pelo header `X-Internal-Token` (comparado em tempo constante), e cria ou
reutiliza uma sessão guardando somente o HMAC do telefone (nunca o número em texto puro). Com o
atendimento automático pausado, responde o texto fixo sem tocar na sessão (seção "Pausa").

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
- O Admin (`is_admin`) recebe as 8 sem linhas em `UserPermissions`. As outras contas recebem as que
  estão em `UserPermissions` (#62), na ordem de `PERMISSIONS`. `requireAuth` relê a conta e as
  permissões a cada requisição: uma permissão removida vale na próxima requisição, sem novo login.
- Rotas só do Admin (decisão 004, ex.: WhatsApp) usam `requirePermission(ADMIN_ONLY)`, de
  `types/auth.types.ts`. Só `is_admin` passa: um funcionário recebe `403 FORBIDDEN` mesmo com as 8
  chaves. `ADMIN_ONLY` não é uma permissão e não entra em `PERMISSIONS`.

### CSRF e CORS

- `requireTrustedOrigin` é montado em `/api/v1` depois de `POST /api/v1/whatsapp/sessions` e de
  `GET /api/v1/internal/whatsapp/config` (servidor a servidor, sem cookie) e antes de `/api/v1/auth`. **Toda rota nova sob `/api/v1` herda a
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
  senha. Sem conta Admin, sai com código 1 e pede para rodar o seed. Em produção, use
  `deploy/reset-admin-password.sh`, que pede a senha sem mostrá-la e roda este script no
  container (veja `.docs/infra/deploy.md`).

## Configuração do WhatsApp (#83)

As credenciais da Cloud API ficam na linha única de `WhatsAppSettings` (decisão 003), com o token de
acesso e o App Secret cifrados por `utils/crypto.utils.ts` (formato `v1:`, chave `ENCRYPTION_KEY`).
Nenhuma resposta, erro ou log devolve esses dois segredos nem o texto cifrado. A linha é criada pelo
`seed` a partir dos `WHATSAPP_*` do `.env` (`db/seeds/README.md`); sem ela, a primeira leitura do
painel cria uma linha só com um `verify_token` gerado.

### Rotas do painel

Todas sob `/api/v1/whatsapp/settings`, com `requireAuth`, `requirePermission(ADMIN_ONLY)` e
`Cache-Control: no-store`. Erros comuns: `401 UNAUTHORIZED` sem cookie válido, `403 FORBIDDEN`
`"Insufficient permission"` para quem não é Admin (mesmo com as 8 permissões), `403 INVALID_ORIGIN`
em `POST`/`PUT` sem origem confiável e `400 BAD_REQUEST` `"Malformed JSON body"`.

| Rota | Corpo | Sucesso | Erros próprios |
| --- | --- | --- | --- |
| `GET /` | — | `200 { data: WhatsAppSettingsView }` | — |
| `POST /test` | `{ phoneNumberId, businessAccountId?, accessToken?, appSecret? }` | `200 { data: { ok: true, displayPhoneNumber, verifiedName, checkedAt, accessTokenLifetime } }` ou `200 { data: { ok: false, reason, checkedAt } }` | `400` |
| `PUT /` | igual ao teste | `200 { data: WhatsAppSettingsView }` | `400`; `422 { error: { code: <reason>, message: "WhatsApp connection test failed" } }` |
| `POST /pause` | — | `200 { data: WhatsAppSettingsView }` com `autoReplyPaused: true` | — |
| `POST /resume` | — | `200 { data: WhatsAppSettingsView }` com `autoReplyPaused: false` | — |
| `GET /templates` | — | `200 { data: { checkedAt, templates: [{ kind: "CANCELLATION" \| "REMINDER", name, languageCode, status, metaStatus }] } }` | `409 WHATSAPP_NOT_CONFIGURED` (sem ID da conta, token ou App Secret); `422 { error: { code: <reason> } }` |
| `GET /number-status` | — | `200 { data: { checkedAt, qualityRating, messagingLimit: { tier, dailyLimit, usedLast24h } } }` | `409 WHATSAPP_NOT_CONFIGURED` (sem ID do número, token ou App Secret); `422 { error: { code: <reason> } }` |

**Modelos e estado do número (#67).** As duas rotas consultam a Meta a cada chamada, sem cache, com o
`appsecret_proof`, e usam os motivos do teste de conexão no `422`.

- `GET /templates` faz uma consulta por modelo (`GET /<versão>/<businessAccountId>/message_templates?fields=name,status,language&name=<nome>`)
  e só aceita o nome e o idioma exatos de `MODELO_AVISO_CANCELAMENTO` e `MODELO_LEMBRETE_ATENDIMENTO`.
  `status`: `APPROVED`; `PENDING` (também `IN_APPEAL`); `REJECTED`; `NOT_FOUND` (a Meta não devolveu o
  modelo); `OTHER` (`PAUSED`, `DISABLED`, `PENDING_DELETION`, `DELETED`, `LIMIT_EXCEEDED`, `ARCHIVED`).
  `metaStatus` traz o valor bruto da Meta, ou `null`.
- `GET /number-status` lê `quality_rating` e `whatsapp_business_manager_messaging_limit` (o
  `messaging_limit_tier` está obsoleto na Meta). `qualityRating`: `GREEN` → `HIGH`, `YELLOW` →
  `MEDIUM`, `RED` → `LOW`, qualquer outro (inclusive `NA`) → `UNKNOWN`. `tier` é o valor bruto da Meta,
  e `dailyLimit` só é preenchido para `TIER_250`. `usedLast24h` conta no banco os telefones distintos
  (`Sessions.phone_hash`) com `CITIZEN_NOTIFIED` de `kind` `CANCELLATION` ou `REMINDER` em
  `[agora - 24h, agora]`.

O cadastro dos modelos na Meta está em [`.docs/whatsapp/modelos-de-mensagem.md`](../../.docs/whatsapp/modelos-de-mensagem.md).

`WhatsAppSettingsView`:

```json
{
    "phoneNumberId": "100000000000001",
    "businessAccountId": null,
    "accessToken": { "configured": true, "last4": "a91F" },
    "appSecret": { "configured": true, "last4": "9c2e" },
    "verifyToken": "3f9a...",
    "webhookUrl": "https://exemplo.sslip.io/webhooks/whatsapp",
    "graphApiVersion": "v26.0",
    "credentialsValid": true,
    "credentialsCheckedAt": "2026-10-14T13:00:00.000Z",
    "autoReplyPaused": false,
    "pausedMessage": "O atendimento automático do PROCON Jacareí está temporariamente indisponível. Tente novamente mais tarde.",
    "updatedBy": { "id": 1, "name": "Admin" },
    "updatedAt": "2026-10-14T13:00:00.000Z",
    "displayPhoneNumber": "+55 12 3955-9000",
    "verifiedName": "PROCON Jacareí",
    "accessTokenLifetime": { "kind": "PERMANENT", "expiresAt": null }
}
```

- `phoneNumberId`, `businessAccountId`, `webhookUrl`, `credentialsValid`, `credentialsCheckedAt`,
  `updatedBy`, `displayPhoneNumber` e `verifiedName` podem ser `null`. `webhookUrl` é `null` sem
  `PUBLIC_BASE_URL`.
- `displayPhoneNumber` e `verifiedName` são o número institucional e o nome verificado que a Meta
  devolveu no último teste ou salvar com `ok` dos valores salvos (colunas `display_phone_number` e
  `verified_name`, migration `14`). Ficam `null` até o primeiro teste ou salvar bem-sucedido. Teste
  de valores novos ou teste que falha não muda esses dois campos.
- `accessTokenLifetime` é o tipo do token de acesso: `{ "kind": "PERMANENT", "expiresAt": null }`
  (a Meta diz que não expira), `{ "kind": "EXPIRING", "expiresAt": "<ISO 8601 UTC>" }` ou
  `{ "kind": "UNKNOWN", "expiresAt": null }` (não deu para saber ou nunca verificado). Na leitura, é o
  tipo do token salvo, lido das colunas `access_token_permanent` e `access_token_expires_at`
  (migration `15`, sem chamar a Meta). No `POST /test` com `ok: true`, é o tipo do token usado no
  teste (o enviado ou o salvo). Com `ok: false`, o campo não vem.
- `last4` é `null` quando o segredo não está configurado, tem 8 caracteres ou menos, ou não decifra
  (neste caso `configured` continua `true` e o log registra `whatsapp_settings_decrypt_failed` com o
  campo, sem o valor). A tela monta a máscara `••••••••a91F`.
- **Validação do corpo:** `phoneNumberId` obrigatório, só dígitos, até 40 (espaços nas pontas são
  removidos). `businessAccountId` opcional: ausente, `null` ou vazio grava `NULL`; preenchido, mesma
  regra. `accessToken` de 1 a 2048 caracteres sem espaço e `appSecret` de 1 a 256 sem espaço;
  `null` ou ausente mantém o valor salvo. Sem valor salvo legível, o segredo é obrigatório (`400`
  `"accessToken is required"` ou `"appSecret is required"`). Corpo inválido nunca chama a Meta.
- **Teste:** consulta a Graph API (`clients/metaGraph.client.ts`, timeout de 10 s, versão de
  `WHATSAPP_GRAPH_API_VERSION`, `appsecret_proof` = HMAC-SHA256 do token com o App Secret):
  `GET /<phoneNumberId>?fields=display_phone_number,verified_name` sempre e, só com
  `businessAccountId`, `GET /<businessAccountId>/phone_numbers?fields=id&limit=100` para conferir
  que o número pertence à conta. Só quando os valores efetivos são iguais aos salvos (mesmos IDs,
  nenhum segredo enviado) o teste grava `credentials_checked_at` e `credentials_valid` e, se der
  `ok`, também `display_phone_number` e `verified_name`, sem mudar `updated_by`/`updated_at`.
- **Tipo do token:** depois de um teste com `ok` (e só nele), o cliente consulta
  `GET /<versão>/debug_token?input_token=<token>&appsecret_proof=<prova>` com o próprio token no
  `Authorization: Bearer` e timeout próprio de 5 s (`META_TOKEN_INSPECTION_TIMEOUT_MS`).
  `data.is_valid === true` com `data.expires_at = 0` vira `PERMANENT`; com `expires_at` inteiro maior
  que zero, `EXPIRING` com a data. Qualquer outra resposta (HTTP de erro, rede, timeout, JSON
  inválido, `is_valid` diferente de `true`, `expires_at` ausente, negativo ou não inteiro) vira
  `UNKNOWN`: a consulta nunca lança erro, nunca vira `422` e nunca impede o teste nem o salvar. O
  resto da resposta (`scopes`, `user_id`, `app_id`) é descartado. Gravação:
  - teste dos valores salvos com `ok`: grava o tipo se for `PERMANENT` ou `EXPIRING`; com `UNKNOWN`,
    mantém o que já estava gravado;
  - teste de valores novos: não grava o tipo, só o devolve;
  - salvar que troca o token: grava o tipo inspecionado, inclusive `UNKNOWN` (as duas colunas
    nulas), para o tipo do token antigo não ficar no novo;
  - salvar que mantém o token: grava `PERMANENT`/`EXPIRING` e mantém o gravado com `UNKNOWN`.
- **Salvar:** refaz o teste com os valores efetivos e só grava se der `ok`. Grava os IDs, cifra só os
  segredos enviados (o cifrado dos outros fica igual), `credentials_valid = true`,
  `credentials_checked_at`, `display_phone_number` e `verified_name` do teste refeito, `updated_by` e
  `updated_at` numa única `UPDATE`, e depois avisa o gateway
  (`POST <GATEWAY_INTERNAL_URL>/internal/whatsapp/config/reload`, timeout de 3 s). Uma falha no aviso
  não muda a resposta `200`; o gateway recarrega pelo TTL de 60 s.
- **Pausar/retomar:** grava `auto_reply_paused`, `updated_by` e `updated_at`, é idempotente, não
  passa pelo teste e não avisa o gateway.

Motivos (`reason`) do teste e textos sugeridos para a tela (#54):

| `reason` | Quando | Texto sugerido | Grava `credentials_valid` (teste dos valores salvos) |
| --- | --- | --- | --- |
| `INVALID_TOKEN` | erro `code` 190 | "Token inválido ou expirado" | `false` |
| `INVALID_APP_SECRET` | erro `code` 100 com `appsecret_proof` na mensagem | "App Secret inválido" | `false` |
| `PHONE_NUMBER_NOT_FOUND` | erro `code` 100 com `error_subcode` 33 na consulta do número | "ID do número não encontrado ou sem acesso por este token" | `false` |
| `BUSINESS_ACCOUNT_NOT_FOUND` | erro `code` 100 com `error_subcode` 33 na consulta da conta | "ID da conta WhatsApp Business não encontrado ou sem acesso por este token" | `false` |
| `PHONE_NOT_IN_ACCOUNT` | a conta não lista o número | "O número não pertence a esta conta WhatsApp Business" | `false` |
| `MISSING_PERMISSION` | erro `code` 10 ou 200 | "O token não tem permissão para gerenciar este número" | `false` |
| `META_UNAVAILABLE` | timeout, erro de rede, HTTP 5xx ou `code` 4/80007 | "Não foi possível falar com a Meta. Tente de novo em instantes" | não grava |
| `META_ERROR` | qualquer outra resposta de erro | "A Meta recusou as credenciais" | não grava |

O cliente da Meta loga só `{ event: "meta_connection_test", reason, status, code }`, nunca o token, o
App Secret, a prova ou a URL. Quando a consulta do tipo do token dá `UNKNOWN` por falha, ele loga só
`{ event: "meta_token_inspection", outcome: "unknown", status?, code? }`: o `debug_token` leva o
token na query (`input_token`), então a URL e o erro capturado nunca são registrados nem repassados.

### Pausa

Com `auto_reply_paused` ligado, `POST /api/v1/whatsapp/sessions` responde `202` com o texto fixo
`MENSAGEM_ATENDIMENTO_PAUSADO` (`services/messageFormatter.service.ts`), antes de qualquer acesso à
sessão:

```json
{ "data": { "sessionId": null, "newSession": false, "paused": true, "reply": { "text": "<texto fixo>", "step": null, "messages": [{ "type": "text", "text": "<texto fixo>" }] } } }
```

Nada é criado nem alterado: nenhuma sessão, nenhum evento, nenhum `last_interaction_at` renovado, e
nem o HMAC do telefone é calculado. A pausa é lida do banco a cada mensagem, então vale a partir da
mensagem seguinte ao clique. Ao retomar, a sessão em andamento continua no passo em que estava. Pela
decisão 008, uma pausa de mais de 30 minutos faz as sessões em andamento virarem Abandonadas.

### Endpoint interno (gateway → backend)

`GET /api/v1/internal/whatsapp/config`, montado antes de `requireTrustedOrigin`, com `X-Internal-Token`
comparado em tempo constante (`utils/internalToken.ts`) e `Cache-Control: no-store`:

- sem token válido: `401 UNAUTHORIZED` `"Invalid gateway internal token"`;
- `200 { data: { phoneNumberId, accessToken, appSecret, verifyToken, graphApiVersion } }`, com os
  segredos decifrados. `phoneNumberId`, `accessToken` e `appSecret` podem ser `null`;
- segredo que não decifra, ou linha de `WhatsAppSettings` ausente: `500` genérico. O endpoint só lê:
  nunca cria a linha.

Em produção o Caddy responde `404` para `/api/v1/internal*` e o `deploy.sh` confere isso. O gateway
alcança o backend só pela rede interna do Docker.

### Trocar a `ENCRYPTION_KEY`

Não existe rotação automática. Trocar a chave deixa o token e o App Secret salvos ilegíveis: a leitura
mostra `configured: true` com `last4: null`, o endpoint interno responde `500` e o gateway passa a usar
a última configuração carregada até reiniciar. Depois de trocar a chave e recriar o `backend`, salve de
novo o token e o App Secret pela tela de WhatsApp (ou `PUT /api/v1/whatsapp/settings`, enviando os
dois).

## Contas e permissões (/api/v1/users, #62)

Contas de funcionários com permissões marcadas uma a uma ([decisão 004](../../.docs/decisoes/004-contas-e-permissoes-granulares.md),
[regras da tela](../../.docs/regras/10-usuarios.md); a tela é a #123). Todas as rotas passam pela
proteção CSRF (`403 INVALID_ORIGIN` nos métodos que alteram), por `requireAuth` e por
`requirePermission("users.manage")`, e respondem com `Cache-Control: no-store`. Nenhuma resposta tem
`password_hash`, `session_version` nem senha. Camadas: `routes/userAccount.routes.ts` (classe
`UserAccountRoutes`), `controllers/userAccount.controller.ts`, `services/userAccount.service.ts`,
`repositories/userAccount.repository.ts`; a entrada é validada com os schemas de
`schemas/userAccount.schema.ts`.

### Rotas

| Rota | Corpo | Sucesso | Erros |
| --- | --- | --- | --- |
| `GET /api/v1/users` | — | `200 { data: { items: UserAccount[], lastChange: { name, at } \| null } }` | `401`, `403 FORBIDDEN` |
| `POST /api/v1/users` | `{ name, email, password }` | `201 { data: UserAccount }`, ativa, sem permissões e nunca Admin (`permissions` e `isAdmin` no corpo são ignorados) | `400 BAD_REQUEST`, `409 EMAIL_ALREADY_IN_USE` |
| `PATCH /api/v1/users` | o lote (abaixo) | `200 { data: { items, lastChange, redistributed } }`, com a lista inteira já atualizada | `400`, `404 NOT_FOUND`, `403` e `409` com os códigos abaixo |
| `GET /api/v1/users/:id/future-appointments` | — | `200 { data: [{ id, protocol, name, appointmentDatetime, status }] }`, em ordem crescente de data | `400`, `404 NOT_FOUND` |
| `POST /api/v1/users/:id/reset-password` | `{ password }` | `200 { data: { reset: true } }` | `400`, `404 NOT_FOUND` com `details.userId`, `403 SELF_ACCOUNT_LOCKED`, `ADMIN_ACCOUNT_LOCKED`, `TARGET_HAS_MORE_PERMISSIONS` |

`UserAccount`: `{ id, name, email, isAdmin, active, permissions, lastLoginAt, permissionsUpdatedAt,
permissionsUpdatedBy: { id, name } | null }`. `permissions` segue a ordem de `PERMISSIONS`, e o Admin
sai com as 8. A lista traz o Admin primeiro, depois as contas ativas por nome e por fim as inativas
por nome. `lastChange` é a conta com o `permissions_updated_at` mais recente ("Última alteração por
[nome] em [data]").

- O e-mail é gravado aparado e em minúsculas, com até 150 caracteres. Duas criações simultâneas com o
  mesmo e-mail gravam uma só: a violação `23505` de `users_email_key` ou de `uniq_users_email_lower`
  vira `409 EMAIL_ALREADY_IN_USE`.
- A senha segue `utils/passwordPolicy.ts` (8 caracteres a 72 bytes) e é gravada com `bcryptjs`
  custo 12. A mensagem do `400` é a da política.
- Os agendamentos futuros de uma conta são os `CONFIRMED` dela com horário depois de agora. Um
  pendente nunca tem responsável, e um confirmado já passado ("Aguardando registro") fica com a conta.
  A resposta tem o nome do titular e o protocolo, nunca CPF nem telefone.

### Lote (`PATCH /api/v1/users`)

```json
{
    "changes": [
        { "userId": 7, "permissions": ["appointments.view", "appointments.manage"] },
        { "userId": 9, "active": false, "reassignment": { "mode": "assign", "toUserId": 7 } },
        { "userId": 12, "permissions": [], "reassignment": { "mode": "pending" } }
    ]
}
```

- `changes` tem de 1 a 100 itens, sem `userId` repetido. Cada item tem `permissions` (o conjunto final
  da conta, com chaves de `PERMISSIONS` sem repetir), `active`, ou os dois. Um item só com
  `reassignment` é `400`.
- **Atomicidade:** o lote inteiro roda numa transação. As contas do lote e os destinos de "atribuir a
  outro" são travados juntos, numa única consulta `FOR UPDATE` em ordem de id (dois lotes com contas em
  comum não entram em deadlock), e os agendamentos futuros das contas do lote também são travados. As
  regras rodam sobre esse estado travado (`services/userAccountRules.ts`, `decideAccountBatch`). Se
  qualquer conta falhar, nada é gravado: nem as outras contas, nem os agendamentos, nem os eventos.
- **Ordem e erro determinístico:** os itens são avaliados em ordem crescente de `userId`. Primeiro as
  checagens de cada item (conta existe → Admin → própria conta → `TARGET_HAS_MORE_PERMISSIONS`, só se
  muda `active` → `PERMISSION_NOT_HELD`), depois a redistribuição de cada conta
  (`REASSIGNMENT_REQUIRED` → `INVALID_REASSIGNMENT_TARGET` → `REASSIGNMENT_TARGET_BUSY`). O erro
  devolvido é o da primeira conta que falhar.
- **"Gerenciar agendamentos" inclui "Ver agendamentos":** se o conjunto pedido tem
  `appointments.manage`, o servidor grava também `appointments.view`. As regras contra escalada
  valem depois disso.
- Um item que pede o estado atual da conta não grava nada, nem o "alterado por". Quando as
  permissões ou o `active` mudam, `permissions_updated_by` e `permissions_updated_at` recebem quem
  salvou e o instante do lote, e as linhas novas de `UserPermissions` recebem `granted_by` e
  `granted_at`.
- **`session_version`:** desativar incrementa (as sessões abertas caem, e um token antigo continua
  recusado depois de reativar). Reativar não incrementa. Redefinir a senha incrementa, mesmo com a
  conta inativa (a senha nova vale quando ela for reativada).

### Redistribuição dos agendamentos futuros

Quando um item desativa a conta ou tira dela `appointments.manage` e ela tem agendamentos futuros, o
item precisa de `reassignment`. A lista é recalculada dentro da transação (o corpo não traz ids de
agendamento), e cada agendamento ganha um evento no histórico com `actor_user_id` de quem salvou e o
instante do lote:

- `{ "mode": "pending" }`: o agendamento volta a `PENDING` sem responsável, com `BACK_TO_PENDING` e
  `{ "reason": "USER_DEACTIVATED" | "MANAGE_PERMISSION_REMOVED" }`;
- `{ "mode": "assign", "toUserId": <id> }`: continua `CONFIRMED` com o novo responsável, com `ASSIGNED`
  e `{ "assignee_user_id": <id>, "reason": ... }`.

Se o item desativa e tira `appointments.manage` ao mesmo tempo, o motivo é `USER_DEACTIVATED`. Fora
desses casos, `reassignment` é ignorado. As gravações ficam em `repositories/appointmentReassignment.ts`
(`assignAppointment` e `returnAppointmentToPending`), que recebem um `PoolClient` já em transação e não
decidem regra. "Atribuir a outro funcionário" (#87) reaproveita `assignAppointment`.

O destino de "atribuir a outro" precisa existir, ser outra conta, estar ativo e ser o Admin ou ter
`appointments.manage`, tudo no **estado final do lote** (`isValidResponsible`, em
`services/responsibleAvailability.ts`): uma conta que ganha
"Gerenciar agendamentos" no mesmo lote é aceita; uma que é desativada ou perde a permissão no mesmo
lote, não. Senão, `409 INVALID_REASSIGNMENT_TARGET`.

**Uma pessoa não atende dois agendamentos ao mesmo tempo** (`services/responsibleAvailability.ts`,
`findResponsibleConflict` e `countFreeStaff`). Dois `CONFIRMED` da mesma conta não podem ter
intervalos `[início, início + duração)` sobrepostos. A duração é a da versão da agenda que vale hoje
(`readSlotMinutes(client, now)` em `repositories/responsibleQueries.ts`: a última mudança de
`ScheduleChanges` com início até a data ou, sem mudança, `ScheduleSettings.slot_minutes`), porque o
agendamento não guarda a sua; sem configuração, só o mesmo início conflita. O lote ainda usa essa
duração para todos os agendamentos dele, mesmo os que caem depois de uma mudança agendada com outra
duração. Com 30
minutos, quem tem 13:00 não pode receber 13:00 nem 13:20, mas pode receber 13:30. Cada agendamento
redistribuído é conferido contra os `CONFIRMED` do destino e contra os que o mesmo lote já levou para
ele; com sobreposição, `409 REASSIGNMENT_TARGET_BUSY` e nada do lote é gravado. Se a duração mudar
depois (#64), dois `CONFIRMED` que antes não se sobrepunham podem passar a se sobrepor sem aviso.

### Códigos de erro

Os erros de regra do lote trazem a conta que falhou em `details`, para a tela destacá-la. O
envelope só tem `details` quando o erro o define; os demais erros continuam
`{ "error": { "code", "message" } }`.

```json
{ "error": { "code": "PERMISSION_NOT_HELD", "message": "Você não pode conceder nem remover uma permissão que não tem", "details": { "userId": 7 } } }
{ "error": { "code": "REASSIGNMENT_TARGET_BUSY", "message": "O destino já tem um agendamento nesse horário", "details": { "userId": 9, "toUserId": 7, "protocol": "AB12CD34", "conflictingProtocol": "EF56GH78" } } }
```

| Código | Status | Quando |
| --- | --- | --- |
| `NOT_FOUND` | 404 | A conta do item do lote ou da `reset-password` não existe (`details.userId`) |
| `ADMIN_ACCOUNT_LOCKED` | 403 | A conta é o Admin (item do lote ou `reset-password`) |
| `SELF_ACCOUNT_LOCKED` | 403 | A conta é a de quem pede. Para a própria senha existe `POST /auth/change-password` |
| `TARGET_HAS_MORE_PERMISSIONS` | 403 | `reset-password`, ou item que muda `active`, numa conta com uma permissão que quem pede não tem |
| `PERMISSION_NOT_HELD` | 403 | O item concede ou remove uma permissão que quem pede não tem (diferença entre o conjunto atual e o pedido, já com "Ver agendamentos" acrescentado) |
| `REASSIGNMENT_REQUIRED` | 409 | A conta perde a capacidade de atender, tem agendamentos futuros e o item não traz `reassignment` |
| `INVALID_REASSIGNMENT_TARGET` | 409 | O destino não existe, é a própria conta, está inativo ou não gerencia agendamentos no estado final do lote |
| `REASSIGNMENT_TARGET_BUSY` | 409 | O destino já tem um `CONFIRMED` sobreposto (`details.toUserId`, `protocol`, `conflictingProtocol`) |
| `EMAIL_ALREADY_IN_USE` | 409 | Criação com um e-mail que já existe, mesmo com outras maiúsculas |

O Admin nunca recebe `PERMISSION_NOT_HELD` nem `TARGET_HAS_MORE_PERMISSIONS`. Se quem pede perde
`users.manage` durante a requisição, vale a permissão lida no `requireAuth` daquela requisição.

## Agendamentos (/api/v1/appointments)

Rotas de consulta e ações sobre agendamentos presenciais no painel (telas #85, #86 e #126; API das
ações, observações, lista de funcionários e calendário na #87). Todas exigem
sessão (`requireAuth`) e permissão (`requirePermission`). O `PATCH` e o `POST` também passam pela proteção CSRF
(`403 INVALID_ORIGIN` quando a origem não é o `FRONTEND_ORIGIN`). O controller e as rotas seguem o
padrão em classe (`AppointmentController`, `AppointmentRoutes.getRouter()`), e a entrada é validada
por `validateRequest` (`middleware/validateRequest.middleware.ts`) com os schemas zod de
`schemas/appointment.schema.ts`. A regra de transição de status fica num helper puro,
`services/appointmentTransitions.ts` (`decideTransition` e `availableActions`), usado pelo
repositório dentro da transação, pelo mock e pelo detalhe.

### Rotas

| Rota | Permissão | O que faz | Sucesso | Erros |
| --- | --- | --- | --- | --- |
| `GET /api/v1/appointments/pending-count` | `appointments.view` | Quantidade de agendamentos `PENDING` (badge do menu). Como `chk_appointments_pending_unassigned` impede pendente com responsável, é o mesmo que "pendentes sem responsável" | `200 { data: { count } }` | `401 UNAUTHORIZED`, `403 FORBIDDEN` |
| `GET /api/v1/appointments/staff` | `appointments.view` | Funcionários que podem ser responsáveis: o Admin e as contas com `appointments.manage`, ativas e inativas, por nome. Serve ao filtro "Um funcionário específico" (todas) e ao seletor de "Atribuir" (só as ativas, sem o responsável atual) | `200 { data: [{ id, name, active }] }` | `401`, `403 FORBIDDEN` |
| `GET /api/v1/appointments/calendar` | `appointments.view` | Calendário semanal (seção abaixo). Query: `date` (`AAAA-MM-DD`, padrão hoje em São Paulo), `status` e `responsible` com os mesmos valores da lista | `200 { data: Calendar }` | `400 BAD_REQUEST`, `401`, `403 FORBIDDEN` |
| `GET /api/v1/appointments` | `appointments.view` | Lista com busca, filtros, ordenação, paginação e contagem dos chips (query abaixo) | `200 { data: { items, total, page, limit, totalPages, chipCounts } }` | `400 BAD_REQUEST`, `401`, `403` |
| `GET /api/v1/appointments/:id` | `appointments.view` | Detalhe com histórico (`events`), linha do tempo da conversa de origem (`timeline`) e ações disponíveis (`available_actions`) | `200 { data: AppointmentDetail }` | `400 BAD_REQUEST` (id que não é inteiro positivo ou passa do limite do `bigint`), `401`, `403`, `404 NOT_FOUND` |
| `PATCH /api/v1/appointments/:id/status` | `appointments.manage` | Executa uma ação. Corpo: `{ "action": "claim" \| "attended" \| "no_show" \| "correct_record" }`, `{ "action": "assign", "assigneeUserId": <id> }` (número ou texto numérico) ou `{ "action": "cancel", "reason": "UNIT_CLOSED" \| "CITIZEN_REQUEST" \| "DUPLICATE" \| "OTHER", "note"?: "..." }` (seção "Cancelamento pela equipe") | `200 { data: AppointmentDetail }`, o mesmo objeto que um `GET /:id` feito em seguida. `correct_record` pode trazer também `warning` (abaixo) | `400 BAD_REQUEST`, `401`, `403 FORBIDDEN`, `403 INVALID_ORIGIN`, `404 NOT_FOUND`, `409` (codes na tabela de ações) |
| `GET /api/v1/appointments/:id/cancellation-preview` | `appointments.manage` | A mensagem exata que o cidadão recebe para cada motivo, na ordem `UNIT_CLOSED`, `CITIZEN_REQUEST`, `DUPLICATE`, `OTHER` | `200 { data: { previews: [{ reason, message }] } }` | `400 BAD_REQUEST`, `401`, `403 FORBIDDEN`, `404 NOT_FOUND` |
| `POST /api/v1/appointments/:id/cancellation-notice/retry` | `appointments.manage` | Reenvia o aviso de cancelamento que falhou | `200 { data: AppointmentDetail }` | `401`, `403 FORBIDDEN`, `403 INVALID_ORIGIN`, `404 NOT_FOUND`, `409 NOTIFICATION_NOT_RETRYABLE`, `409 CITIZEN_PHONE_UNAVAILABLE`, `409 NOTIFICATION_AFTER_START`, `409 NOTIFICATION_IN_PROGRESS` |
| `POST /api/v1/appointments/:id/notes` | `appointments.manage` | Grava uma observação interna. Corpo: `{ "text": "..." }`, de 1 a 2000 caracteres depois de aparar. Não há rota de edição nem de exclusão, e o trigger `trg_appointment_notes_immutable` recusa `UPDATE` e `DELETE` | `201 { data: AppointmentDetail }` | `400 BAD_REQUEST`, `401`, `403 FORBIDDEN`, `403 INVALID_ORIGIN`, `404 NOT_FOUND` |

Erros sempre no envelope `{ "error": { "code": "...", "message": "..." } }`. O painel traduz pelo
`code`; a `message` é só para log e depuração. Exemplos reais:

```json
{ "error": { "code": "BAD_REQUEST", "message": "Dados inválidos: id: ID do agendamento inválido" } }
{ "error": { "code": "NOT_FOUND", "message": "Agendamento não encontrado" } }
{ "error": { "code": "APPOINTMENT_ALREADY_CLAIMED", "message": "Apenas agendamentos pendentes podem ser assumidos" } }
{ "error": { "code": "ASSIGNEE_BUSY", "message": "O funcionário já tem outro agendamento neste horário", "details": { "assigneeUserId": "7", "conflictingAppointmentId": "456", "conflictingProtocol": "B71C0D2E" } } }
```

### Query da lista

| Parâmetro | Valores | Padrão |
| --- | --- | --- |
| `search` | texto com 2 ou mais caracteres depois do `trim` (vazio conta como ausente) | — |
| `status` | `all`, `PENDING`, `CONFIRMED`, `ATTENDED`, `NO_SHOW`, `CANCELED`, `waiting_record` | `all` |
| `period` | `all`, `today`, `this_week`, `upcoming`, `past` | `upcoming` |
| `responsible` | `all`, `unassigned`, `me` (a conta logada) ou o id numérico de um funcionário | `all` |
| `sortBy` | `name`, `appointment_datetime`, `responsible`, `status` | ordem padrão do filtro (abaixo) |
| `sortOrder` | `asc`, `desc` | `asc` quando há `sortBy` |
| `page` | inteiro ≥ 1 | `1` |
| `limit` | inteiro de 1 a 100 | `20` |

Valor fora da lista devolve `400 BAD_REQUEST` com `Dados inválidos: <campo>: <motivo>`.

- **Busca.** Com `search`, `status`, `period` e `responsible` são ignorados e `total` conta só o
  resultado da busca (a tela abre o agendamento direto quando `total === 1`). O termo é tratado como
  CPF só quando tem apenas dígitos, pontos, hífens e espaços (`/^[\d.\-\s]+$/`) e soma 11 dígitos:
  aí a busca compara o HMAC-SHA256 do CPF (`CPF_HASH_SECRET`), nunca o CPF em claro. Qualquer outro
  termo procura no nome (sem diferenciar maiúsculas e acentos, `unaccent`) e no início do
  `appointment_code` (`ILIKE`, então o protocolo em maiúsculas também acha). Um código com letras e
  11 dígitos não entra no modo CPF.
- **Período e fuso.** Datas saem em ISO 8601 UTC. "Hoje" e "Esta semana" são calculados no fuso
  `America/Sao_Paulo` (`utils/date.utils.ts`, por `Intl`, sem offset fixo); `upcoming` é a partir
  do início de hoje e `past` é antes do início de hoje. O painel formata as datas em
  `America/Sao_Paulo`.
- **Ordem padrão.** Com `sortBy`, desempata por data e id. Sem `sortBy`: o chip de status tem
  precedência sobre o período. Cancelados, Atendidos e Não compareceu saem do mais recente para o mais
  antigo; Pendentes, Confirmados e Aguardando registro, do mais próximo para o mais distante; `today`,
  `this_week` e `upcoming` em ordem crescente; `past` em ordem decrescente; `all` e a busca mostram
  primeiro os futuros (crescente) e depois os passados (decrescente). Em `sortBy=responsible`, "Sem
  responsável" vem primeiro no `asc`.
- **Chips (`chipCounts`).** Contam respeitando o `period` e o `responsible` da requisição;
  `waiting_record` (confirmados com horário já passado) respeita só o `responsible`. A busca e o
  `status` não mudam os chips.
- **"Um funcionário específico".** A rota aceita `responsible=<id>`, e `GET /api/v1/appointments/staff`
  (#87) lista os funcionários para esse filtro e para o seletor de "Atribuir" com `appointments.view`
  (`GET /api/v1/users` exige `users.manage`).

Item da lista (`GET /api/v1/appointments`, resposta real do smoke, dados fictícios):

```json
{
    "data": {
        "items": [
            {
                "id": "1",
                "protocol": "F10464F0",
                "appointment_code": "f10464f0-81f5-400c-b45b-e841ab409255",
                "name": "Maria Fictícia",
                "cpf_masked": "***.982.247-**",
                "category_name": "Cobrança/Desconto Indevido",
                "question_title": "Prescrição de dívida",
                "appointment_datetime": "2026-10-19T11:00:00.000Z",
                "by_representative": false,
                "assigned_user_id": "1",
                "assigned_user_name": "Admin",
                "status": "CONFIRMED",
                "off_grid": false,
                "waiting_record": false
            }
        ],
        "total": 1,
        "page": 1,
        "limit": 20,
        "totalPages": 1,
        "chipCounts": {
            "all": 1,
            "pending": 0,
            "confirmed": 1,
            "attended": 0,
            "no_show": 0,
            "canceled": 0,
            "waiting_record": 0
        }
    }
}
```

`protocol` são os 8 primeiros caracteres do `appointment_code` em maiúsculas, iguais aos que o bot
envia ao cidadão. `off_grid` marca o agendamento fora da grade atual, e `waiting_record`, o confirmado
cujo horário já passou.

### Detalhe e resposta do `PATCH`

Resposta real de `PATCH /api/v1/appointments/1/status` com `{ "action": "claim" }`, igual ao `GET`
feito em seguida (só `available_actions` é recalculado a cada resposta):

```json
{
    "data": {
        "id": "1",
        "appointment_code": "f10464f0-81f5-400c-b45b-e841ab409255",
        "protocol": "F10464F0",
        "session_id": "1",
        "status": "CONFIRMED",
        "name": "Maria Fictícia",
        "cpf_masked": "***.982.247-**",
        "by_representative": false,
        "reason": "NOT_RESOLVED",
        "appointment_datetime": "2026-10-19T11:00:00.000Z",
        "rescheduled_from": null,
        "off_grid": false,
        "request_datetime": "2026-10-18T13:46:05.141Z",
        "assigned_user_id": "1",
        "assigned_user_name": "Admin",
        "category_id": "1",
        "category_name": "Cobrança/Desconto Indevido",
        "question_id": "5",
        "question_title": "Prescrição de dívida",
        "documents_sent": {
            "group": [
                "RG ou outro documento oficial com foto",
                "CPF",
                "Comprovante de endereço",
                "Comprovante da reclamação (nota fiscal, contrato, fatura ou protocolo)"
            ],
            "question": []
        },
        "is_documents_config_different": false,
        "events": [
            {
                "id": "2",
                "type": "CLAIMED",
                "actor_user_id": "1",
                "actor_user_name": "Admin",
                "data": {},
                "created_at": "2026-10-18T13:46:05.537Z"
            },
            {
                "id": "1",
                "type": "CREATED",
                "actor_user_id": null,
                "actor_user_name": null,
                "data": {},
                "created_at": "2026-10-18T13:46:05.141Z"
            }
        ],
        "timeline": [
            {
                "id": "1",
                "type": "STARTED",
                "created_at": "2026-10-18T13:46:04.464Z",
                "generated_by_ai": false,
                "data": {}
            },
            {
                "id": "2",
                "type": "CATEGORY_CHOSEN",
                "created_at": "2026-10-18T13:46:04.611Z",
                "generated_by_ai": false,
                "data": {
                    "categoryId": 1,
                    "category_title": "Cobrança/Desconto Indevido"
                }
            },
            {
                "id": "3",
                "type": "QUESTION_CHOSEN",
                "created_at": "2026-10-18T13:46:04.648Z",
                "generated_by_ai": false,
                "data": {
                    "categoryId": 1,
                    "questionId": 5,
                    "category_title": "Cobrança/Desconto Indevido",
                    "question_title": "Prescrição de dívida"
                }
            },
            {
                "id": "4",
                "type": "ANSWER_SENT",
                "created_at": "2026-10-18T13:46:04.658Z",
                "generated_by_ai": false,
                "data": {
                    "categoryId": 1,
                    "questionId": 5,
                    "llm": "NOT_CALLED",
                    "category_title": "Cobrança/Desconto Indevido",
                    "question_title": "Prescrição de dívida"
                }
            },
            {
                "id": "5",
                "type": "RESOLVED_ANSWERED",
                "created_at": "2026-10-18T13:46:04.717Z",
                "generated_by_ai": false,
                "data": {
                    "resolved": false
                }
            },
            {
                "id": "6",
                "type": "SCHEDULE_OFFERED",
                "created_at": "2026-10-18T13:46:04.745Z",
                "generated_by_ai": false,
                "data": {
                    "reason": "NOT_RESOLVED"
                }
            },
            {
                "id": "7",
                "type": "ATTENDEE_CHOSEN",
                "created_at": "2026-10-18T13:46:04.843Z",
                "generated_by_ai": false,
                "data": {
                    "byRepresentative": false
                }
            },
            {
                "id": "8",
                "type": "PHONE_NOTICE_SHOWN",
                "created_at": "2026-10-18T13:46:05.141Z",
                "generated_by_ai": false,
                "data": {}
            },
            {
                "id": "9",
                "type": "APPOINTMENT_CREATED",
                "created_at": "2026-10-18T13:46:05.141Z",
                "generated_by_ai": false,
                "data": {
                    "appointmentId": 1
                }
            }
        ],
        "available_actions": {
            "claim": {
                "allowed": false,
                "code": "APPOINTMENT_ALREADY_CLAIMED"
            },
            "attended": {
                "allowed": false,
                "code": "ATTENDANCE_NOT_YET_AVAILABLE"
            },
            "no_show": {
                "allowed": false,
                "code": "NO_SHOW_NOT_YET_AVAILABLE"
            }
        }
    }
}
```

- `events` é o histórico do agendamento (`AppointmentEvents`), do mais recente ao mais antigo, com
  desempate por `id DESC` (o `CLAIMED` automático e o `ATTENDED`/`NO_SHOW` são gravados no mesmo
  instante). `actor_user_id` nulo significa o cidadão ou o sistema. O `CLAIMED` automático tem
  `data: { "auto_claimed": true }`.
- `timeline` são os passos da conversa de origem (`listBySession`), em ordem cronológica. Não há texto
  pronto: o painel monta o rótulo a partir de `type` e `data`. `data` tem só os campos do evento
  (`categoryId`, `questionId`, `llm`, `resolved`, `reason`, `byRepresentative`, `step`, `from`, `to`,
  `appointmentId`, conforme o tipo; os ids aqui são números) e, quando o evento cita categoria ou
  pergunta, `category_title` e `question_title` resolvidos com o mesmo título de `category_name` e
  `question_title` do detalhe. `generated_by_ai` é `true` só em `ANSWER_SENT` com `llm: "USED"` (o
  painel mostra "Gerado com auxílio de IA"). O `id` do passo é a posição na lista. Se a leitura da
  linha do tempo falhar, a resposta continua `200` com `timeline: []`, e o log registra só o id do
  agendamento e o `code` do erro.
- `notes` são as observações internas (`AppointmentNotes`), em ordem cronológica crescente:
  `{ id, author_user_id, author_user_name, text, created_at }`. Quem tem `appointments.view` as vê.
  Gravar uma observação não cria evento no histórico e nada é enviado ao cidadão.
- `available_actions` tem uma entrada por ação (`claim`, `attended`, `no_show`, `assign`,
  `correct_record` e `add_note`), `{ "allowed": boolean, "code": string | null }`, calculada **para a
  conta logada**. Sem `appointments.manage` (e sem ser o Admin), as seis vêm com
  `{ "allowed": false, "code": "PERMISSION_REQUIRED" }`, e o botão fica desabilitado; a rota da ação
  responde `403 FORBIDDEN`. Com a permissão, `code` é o mesmo que o `PATCH` devolveria naquele instante
  (tabela abaixo), e `add_note` é sempre permitido. `PERMISSION_REQUIRED` nunca é erro HTTP. A
  sobreposição de horário (`ASSIGNEE_BUSY`) não é antecipada: quem decide é a rota. Não há texto em
  português: o painel traduz o `code`.
- Nenhuma resposta traz `cpf_hash`, `phone_encrypted` ou `phone_hash`.

### Ações × status atual

O repositório trava a linha com `SELECT ... FOR UPDATE` e decide com `decideTransition` dentro da
transação. Todas as recusas são `409`:

| Ação | `PENDING` | `CONFIRMED` | `ATTENDED` | `NO_SHOW` | `CANCELED` |
| --- | --- | --- | --- | --- | --- |
| `claim` | vira `CONFIRMED` com a conta logada como responsável (`CLAIMED`) | `409 APPOINTMENT_ALREADY_CLAIMED` | `409 ALREADY_ATTENDED` | `409 ALREADY_NO_SHOW` | `409 APPOINTMENT_CANCELED` |
| `attended` | assume automaticamente (`CLAIMED` com `auto_claimed`) e vira `ATTENDED` | vira `ATTENDED` | `409 ALREADY_ATTENDED` | `409 ALREADY_NO_SHOW` | `409 APPOINTMENT_CANCELED` |
| `no_show` | assume automaticamente e vira `NO_SHOW` | vira `NO_SHOW` | `409 ALREADY_ATTENDED` | `409 ALREADY_NO_SHOW` | `409 APPOINTMENT_CANCELED` |
| `assign` | vira `CONFIRMED` com o destino (`ASSIGNED { assignee_user_id }`) | troca o responsável (`ASSIGNED`) | `409 ALREADY_ATTENDED` | `409 ALREADY_NO_SHOW` | `409 APPOINTMENT_CANCELED` |
| `correct_record` | `409 RECORD_NOT_CORRECTABLE` | `409 RECORD_NOT_CORRECTABLE` | volta ao estado anterior (`RECORD_CORRECTED`) | volta ao estado anterior (`RECORD_CORRECTED`) | `409 RECORD_NOT_CORRECTABLE` |
| `cancel` | vira `CANCELED` (`CANCELED_BY_STAFF { reason }`) | vira `CANCELED`, mantendo o responsável | `409 ALREADY_ATTENDED` | `409 ALREADY_NO_SHOW` | `409 APPOINTMENT_CANCELED` |

Regra de data, conferida depois do status: `attended` só a partir do dia do atendimento em
`America/Sao_Paulo` (antes disso, `409 ATTENDANCE_NOT_YET_AVAILABLE`), e `no_show` só depois do
horário marcado (antes disso, `409 NO_SHOW_NOT_YET_AVAILABLE`). `cancel` só antes do horário
marcado (no horário ou depois, `409 CANCEL_AFTER_START`).

### Cancelamento pela equipe (#67)

- `PATCH /:id/status` com `action: "cancel"` trava a conta de quem age e o agendamento, grava
  `CANCELED`, o evento `CANCELED_BY_STAFF { reason }` e, se vier `note` não vazia depois de aparar (até
  2000 caracteres), uma observação interna em `AppointmentNotes`, tudo na mesma transação. Cancelar
  libera a vaga, porque a contagem de vagas só considera `PENDING` e `CONFIRMED`.
- **Depois do `COMMIT`**, `services/citizenNotification.service.ts` decifra `phone_encrypted` e pede ao
  gateway o envio do modelo `aviso_cancelamento` (`gatewayClient.sendTemplate`, tempo limite de 15 s,
  maior que os 10 s do gateway). Os parâmetros vêm de `parametrosAvisoCancelamento` (nome, protocolo,
  data e hora em Brasília e a frase do motivo), os mesmos da prévia. A observação interna nunca vai ao
  cidadão.
- O resultado vira `CITIZEN_NOTIFIED` ou `CITIZEN_NOTIFICATION_FAILED`, com `data: { kind:
  "CANCELLATION" }` e quem agiu. Falha do gateway, gateway não configurado ou telefone ausente ou
  ilegível gravam a falha, e o cancelamento continua respondendo `200`. A pausa das respostas
  automáticas não bloqueia o aviso.
- Se o próprio aviso lança depois do `COMMIT` (por exemplo, a gravação do resultado falha), o
  cancelamento responde `200` com o detalhe `CANCELED` e o log registra só o id do agendamento e o
  código do erro, sem telefone. Se a leitura do detalhe também falhar, a resposta é `500`, mas o
  cancelamento continua gravado.
- `available_actions.retry_cancellation_notice` só fica `allowed` quando o agendamento foi cancelado
  pela equipe, o último aviso de `kind` `CANCELLATION` (por `created_at, id`) falhou ou não existe, há
  telefone e o horário ainda não passou. O reenvio tem uma trava em memória por agendamento
  (`409 NOTIFICATION_IN_PROGRESS`), suficiente porque o backend roda numa instância só. Dentro da trava
  o alvo é relido, e um aviso que já saiu (`CITIZEN_NOTIFIED`) recusa o reenvio com
  `409 NOTIFICATION_NOT_RETRYABLE`.

Se duas ações chegam juntas (por exemplo, Atendido e Não compareceu), a segunda espera a trava, lê o
status já alterado e recebe o `409` coerente com a ação que ganhou (`ALREADY_ATTENDED` ou
`ALREADY_NO_SHOW`). Só um evento terminal é gravado.

**Atribuir (`assign`).** O destino precisa existir, estar ativo e ser o Admin ou ter
`appointments.manage` (`isValidResponsible`), senão `409 INVALID_ASSIGNEE`. Destino igual ao
responsável atual: `409 ALREADY_ASSIGNED_TO_USER` (atribuir a si mesmo é permitido). Não há limite de
horário: um Confirmado já passado também pode ser atribuído.

**Uma pessoa não atende dois agendamentos ao mesmo tempo** (`findResponsibleConflict`, a mesma regra do
lote de contas). Vale em `assign`, em `claim` e no auto-claim de `attended`/`no_show` sobre um
`PENDING`: se a pessoa já tem outro `CONFIRMED` com intervalo sobreposto (duração = a da versão da
agenda que vale na data do agendamento, por `readSlotMinutes(client, appointmentDatetime)`, a mesma
usada na correção de registro), a resposta é `409 ASSIGNEE_BUSY` com
`details: { assigneeUserId, conflictingAppointmentId, conflictingProtocol }`, e nada é gravado. O
auto-claim de um agendamento cuja data e hora já passaram não confere o horário (registra o que já
aconteceu); `claim` confere sempre. Se a conta de quem clica, já travada, não pode mais ser
responsável (desativada ou sem a permissão entre a autenticação e a trava), `claim` e o auto-claim
respondem `409 INVALID_ASSIGNEE`, o mesmo código de "Atribuir" para um destino inválido, sem `details`.
Isso vale também para o auto-claim de um agendamento já passado.

**Ordem de travas:** sempre as contas antes do agendamento, numa consulta só
(`SELECT ... FROM Users WHERE id = ANY($1) ORDER BY id FOR UPDATE`, `lockAccounts` em
`repositories/responsibleQueries.ts`, a mesma do lote de contas da #62), para não haver deadlock e para
que duas atribuições simultâneas para a mesma pessoa no mesmo horário esperem uma pela outra. Entre as
contas travadas está sempre a de quem age, porque o evento gravado (`actor_user_id`) e a observação
(`author_user_id`) têm chave estrangeira para `Users`, e a checagem dessa chave pede `FOR KEY SHARE`
na conta, que espera o `FOR UPDATE` do lote ou de outra ação. `claim`, `attended` e `no_show` travam
a conta de quem clicou; `assign`, a de quem clicou e a do destino; `correct_record`, a de quem clicou e
a do responsável atual; `POST /:id/notes`, a de quem escreve. Os testes de corrida ficam em
`tests/integration/appointments.lockOrder.integration.test.ts`: uma transação auxiliar segura o
agendamento, as duas operações entram na fila em ordem conhecida e, sem a trava da conta de quem age,
o Postgres acusa deadlock em todas as rodadas. O salvamento de `PUT /api/v1/schedule` segue a mesma
regra: depois da trava consultiva exclusiva `schedule_config`, `saveConfig` trava a conta de quem salva
(`lockAccounts`, porque `ScheduleSettings.updated_by` tem chave estrangeira para `Users`) antes de
travar os agendamentos futuros. Sem isso, salvar a grade enquanto outra pessoa atribui um agendamento
futuro a quem salva fechava um ciclo (o salvamento com o agendamento esperando a conta, a atribuição
com a conta esperando o agendamento). A prova fica em
`tests/integration/scheduleConfig.lockOrder.integration.test.ts`. Salvar uma mudança agendada
(`PUT /api/v1/schedule/versions/:effectiveFrom`) segue a mesma ordem, e ela e o cancelamento
(`DELETE`) pegam a mesma trava exclusiva `schedule_config` que a reserva pega compartilhada. A prova
fica em `tests/integration/scheduleChanges.race.integration.test.ts`: o salvamento que tira um horário
espera a reserva em andamento e responde `409`, a reserva e o salvamento nunca passam juntos, e a
atribuição a quem salva não fecha ciclo. Os critérios da mudança agendada contra o Postgres ficam em
`tests/integration/scheduleChanges.integration.test.ts`.

**Corrigir registro (`correct_record`).** Volta ao estado anterior ao `ATTENDED`/`NO_SHOW` mais recente:
`PENDING` sem responsável quando esse terminal veio junto de um `CLAIMED { auto_claimed: true }` no
mesmo instante, senão `CONFIRMED` com o responsável atual. Grava `RECORD_CORRECTED
{ previous_status, previous_assigned_user_id }` com o estado de antes da correção. Num agendamento
futuro com alvo `CONFIRMED`, se o responsável não pode mais ser responsável ou tem outro `CONFIRMED`
sobreposto, o agendamento volta a `PENDING` sem responsável, e a resposta `200` traz, ao lado de
`data`, um aviso (sem aviso, a chave `warning` não aparece):

```json
{
    "data": { "...": "AppointmentDetail" },
    "warning": {
        "code": "RESPONSIBLE_BUSY",
        "message": "O responsável anterior já tem outro agendamento neste horário. O agendamento voltou para Pendente sem responsável.",
        "details": {
            "appointmentId": "123",
            "protocol": "A3F9C21B",
            "previousAssignedUserId": "7",
            "previousAssignedUserName": "Ricardo Nogueira",
            "conflictingAppointmentId": "456",
            "conflictingProtocol": "B71C0D2E",
            "freeStaffCount": 2
        }
    }
}
```

`RESPONSIBLE_UNAVAILABLE` (responsável desativado ou sem a permissão) vem sem `conflictingAppointmentId`
e `conflictingProtocol`. `freeStaffCount` é o número de contas elegíveis sem `CONFIRMED` sobreposto
naquele horário (`0`: ninguém livre). Num agendamento já passado, a correção restaura o responsável sem
conferir nada. Duas correções simultâneas: uma grava, a outra recebe `409 RECORD_NOT_CORRECTABLE`.

### Calendário semanal (`GET /api/v1/appointments/calendar`)

```json
{
    "data": {
        "weekStart": "2026-10-18",
        "weekEnd": "2026-10-24",
        "weekStartDay": 0,
        "days": [
            {
                "date": "2026-10-22",
                "blocked": { "fullDay": false, "description": null, "periods": [{ "start": "08:00", "end": "09:00", "description": "Manutenção" }] },
                "slots": [{ "time": "08:00", "freeSeats": null }, { "time": "09:00", "freeSeats": 2 }]
            }
        ],
        "appointments": [
            { "id": "1", "protocol": "A1B2C3D4", "shortName": "Maria", "date": "2026-10-22", "time": "08:45", "status": "CONFIRMED", "assigned_user_id": "7", "off_grid": true }
        ]
    }
}
```

- A semana começa em `WEEK_START_DAY` (`utils/week.utils.ts`, hoje `0`, domingo); a resposta traz
  `weekStartDay` para o painel não fixar o dia. Trocar o dia inicial (tela ou banco) é tarefa futura.
- `days` traz só os dias com grade configurada, na ordem da semana; `slots` são os horários da grade
  do dia (`freeSlotStartsOfDay`, a mesma função do bot). Sem `ScheduleSettings`, `days` vem vazio.
- `blocked` descreve os bloqueios do dia: `fullDay` e `description` (o texto do bloqueio de dia
  inteiro, por exemplo "Feriado municipal", ou `null` quando não há) e `periods` com os bloqueios de
  parte do dia (`start`, `end`, `description`).
- `freeSeats` vem de `getAvailableSlots` no mesmo instante: o número de vagas quando o bot pode
  oferecer o horário, e `null` quando não pode (passado, antes da antecedência, fora da janela,
  bloqueado ou lotado).
- `appointments` traz os agendamentos da semana que passam nos filtros `status` e `responsible` da lista
  (com `status=all`, inclusive os cancelados), com data e hora locais. Os fora da grade aparecem na
  hora deles. `shortName` é o primeiro nome do titular; o calendário não devolve CPF, telefone nem o
  nome completo.

## Horários de atendimento (/api/v1/schedule, #64)

Configuração da agenda presencial e prévia mensal de vagas ([decisão 007](../../.docs/decisoes/007-agenda-configuravel.md),
[decisão 012](../../.docs/decisoes/012-horarios-agendados.md) para as mudanças agendadas,
[regras da tela](../../.docs/regras/08-horarios-de-atendimento.md)). Todas as rotas passam pela
proteção CSRF (`403 INVALID_ORIGIN` nos métodos que enviam corpo), por `requireAuth` e por
`requirePermission("schedule.configure")`, e respondem com `Cache-Control: no-store`. Camadas:
`routes/schedule.routes.ts` (`ScheduleRoutes`), `controllers/schedule.controller.ts`
(`ScheduleController`), `services/schedule.service.ts` + `services/scheduleRules.ts` e
`repositories/schedule.repository.ts`; schemas de entrada em `schemas/schedule.schema.ts`.

### Rotas

| Rota | Entrada | Sucesso | Erros |
| --- | --- | --- | --- |
| `GET /api/v1/schedule` | — | `200 { data: ScheduleConfigView }` (a versão que vale hoje; `effectiveFrom` é `null` na configuração-base e a data de início quando é uma mudança que já começou) | `401 UNAUTHORIZED`, `403 FORBIDDEN`, `500 SCHEDULE_NOT_CONFIGURED` |
| `PUT /api/v1/schedule` | `ScheduleConfigInput` | `200 { data: ScheduleConfigView }` | `400 BAD_REQUEST`, `401`, `403`, `409 SCHEDULE_CONFLICTS` com `details.conflicts` |
| `GET /api/v1/schedule/effective?date=YYYY-MM-DD` | `date` obrigatório | `200 { data: ScheduleConfigView }` (a versão que vale na data, com `effectiveFrom`) | `400 BAD_REQUEST`, `401`, `403`, `500 SCHEDULE_NOT_CONFIGURED` |
| `GET /api/v1/schedule/versions` | — | `200 { data: ScheduleVersion[] }` (as mudanças com início depois de hoje, em ordem de data; `[]` se não houver) | `401`, `403` |
| `PUT /api/v1/schedule/versions/:effectiveFrom` | `ScheduleConfigInput`; `effectiveFrom` `YYYY-MM-DD` depois de hoje | `200 { data: ScheduleConfigView }` (cria ou substitui a mudança, com novo autor e horário) | `400 BAD_REQUEST` (data inválida, hoje ou passada, ou bloqueio fora da vigência), `401`, `403`, `409 SCHEDULE_CONFLICTS` com `details.conflicts` |
| `DELETE /api/v1/schedule/versions/:effectiveFrom` | `effectiveFrom` `YYYY-MM-DD` depois de hoje | `204` sem corpo | `400 BAD_REQUEST` (data inválida, hoje ou passada), `401`, `403`, `404 NOT_FOUND`, `409 SCHEDULE_CONFLICTS` com `details.conflicts` |
| `GET /api/v1/schedule/preview?month=YYYY-MM` | `month` opcional (padrão: mês atual em `America/Sao_Paulo`) | `200 { data: MonthlyPreviewResult }` | `400 BAD_REQUEST`, `401`, `403` |
| `POST /api/v1/schedule/preview` | `{ month?: "YYYY-MM", config?: ScheduleConfigInput, effectiveFrom?: "YYYY-MM-DD" }` | `200 { data: MonthlyPreviewResult }` (calcula sobre o rascunho `config` sem gravar no banco, ou sobre a configuração salva se `config` for omitido; com `effectiveFrom`, o rascunho vale a partir dessa data e os dias anteriores seguem a versão salva) | `400 BAD_REQUEST`, `401`, `403` |
| `GET /api/v1/schedule/booked-days` | — | `200 { data: { days: BookedDay[] } }` | `401`, `403` |

- **Mudanças agendadas (#134):** cada mudança é uma cópia integral da configuração em
  `ScheduleChanges` (`effective_from`, `config` JSONB, autor e horário). Para uma data vale a cópia com
  a maior `effective_from` menor ou igual a ela; sem cópia, vale a configuração-base de
  `ScheduleSettings`, `ScheduleRanges` e `BlockedDates`. A grade, a duração, as vagas, os bloqueios e o
  endereço vêm da versão de cada dia; a janela, a antecedência e o alerta de espera vêm da versão que
  vale hoje, e os dias úteis da antecedência contam com a grade de cada dia
  (`computeVersionedWindowBounds`). Os conflitos de uma versão são conferidos só na vigência dela, da
  data de início até a véspera da próxima mudança (`appointmentsInScheduleInterval` em
  `services/scheduleRules.ts`), tanto ao salvar (`PUT`) quanto ao cancelar (`DELETE`, contra a versão
  anterior) e na prévia salva. Salvar a configuração de hoje quando ela é uma mudança que já começou
  grava uma mudança nova com início hoje, sem tocar na anterior. Um bloqueio novo com data de hoje em
  diante fora da vigência da versão salva é recusado com `400` e `details.issues`
  (`blockedDates.N.date`, com o índice do corpo enviado); bloqueios que já estavam na cópia de
  referência continuam aceitos. A regra fica no service (`blocksInVigencyCheck`), que a entrega ao
  repositório em `validateAgainstVersions`; o repositório a roda dentro da transação, depois da trava
  `schedule_config`, com todas as versões de hoje em diante. Assim, uma mudança gravada por outro
  salvamento enquanto este esperava a trava já conta na checagem
  (`scheduleChanges.race.integration.test.ts`).
- **Consistência entre bot e prévia:** o cálculo de vagas disponíveis do bot (`getAvailableSlots`) e
  o cálculo da prévia mensal (`getMonthlyPreview`) compartilham as mesmas funções puras de
  `services/scheduleRules.ts` (`slotsForWeekday`, `freeSlotStartsOfDay`, `isBusinessDay`,
  `computeWindowBounds` e `calculateMonthlyPreview`). Qualquer alteração salva em `PUT /api/v1/schedule`
  entra em vigor imediatamente na oferta de horários do bot.
- **Validações da configuração:** o schema `scheduleConfigBodySchema` (`schemas/schedule.schema.ts`) é
  a única fonte das regras. `normalizeAndValidateScheduleConfig` (`services/scheduleRules.ts`) valida
  com esse schema por `validateSchema` (`utils/validateSchema.ts`) e depois só normaliza: ordena as
  faixas, renumera `slotIndex`, troca complemento vazio por `null` e ordena os bloqueios. Regras:
  - `slotMinutes` em `20, 30, 40, 60`; `seatsPerSlot` de `1` a `20`; `windowDays` de `1` a `180`;
    `minNoticeDays` em `0, 1, 2, 3, 5` (dias úteis com atendimento); `waitAlertDays` de `1` a `60`;
    `reminderHours` em `2, 6, 12, 24, 48`; `unitAddress` obrigatório (até 500 caracteres) e
    `unitAddressComplement` opcional (até 500 caracteres).
  - Até 3 faixas (`ranges`) por dia da semana (`weekday` `0..6`), com `endTime > startTime`, sem
    sobreposição no mesmo dia, sem `slotIndex` repetido no mesmo dia e com duração suficiente para ao
    menos 1 atendimento de `slotMinutes`. As faixas do mesmo dia são ordenadas por `startTime` e
    renumeradas em `slotIndex` `1..3`.
  - Datas bloqueadas (`blockedDates`) do dia inteiro (`startTime` e `endTime` nulos) ou de período
    parcial (`startTime < endTime`), com descrição obrigatória (até 150 caracteres) e sem
    sobreposição na mesma data.
- **Erros de validação por campo:** nas rotas de `/api/v1/schedule` (e só nelas, por
  `validateRequest(schemas, { withIssues: true })`), o `400 BAD_REQUEST` traz também
  `error.details.issues`, um item por problema na ordem do zod, com `path` em texto com ponto. O
  `code` e a `message` são os mesmos das outras rotas, que continuam sem `details`. No
  `POST /api/v1/schedule/preview` o rascunho vai dentro de `config`, então o `path` vem com o prefixo
  `config.` (por exemplo, `config.ranges.2.endTime`); no `PUT /api/v1/schedule` o corpo é a própria
  configuração e o `path` vem sem prefixo:

  ```json
  {
      "error": {
          "code": "BAD_REQUEST",
          "message": "Dados inválidos: ranges.2.endTime: Esta faixa não comporta nenhum atendimento de 30 minutos",
          "details": {
              "issues": [
                  { "path": "ranges.2.endTime", "message": "Esta faixa não comporta nenhum atendimento de 30 minutos" }
              ]
          }
      }
  }
  ```

- **Detecção de conflitos ao salvar:** dentro da transação de `saveConfig`, o repositório pega a trava
  exclusiva `pg_advisory_xact_lock(hashtext('schedule_config'))`, trava a conta de quem salva
  (`lockAccounts`, a mesma ordem "contas antes do agendamento" da #62 e da #87), trava `ScheduleSettings`
  (lendo a duração atual `slot_minutes`) e todos os agendamentos futuros ativos
  (`status IN ('PENDING', 'CONFIRMED')`, `appointment_datetime > now`, inclusive os `off_grid`, travados
  em `ORDER BY id`, como `lockFutureAppointments` da #62, e depois ordenados por data e `id`) e executa
  `detectScheduleConflicts(config, agendamentos, duraçãoAtual)`. Os agendamentos `off_grid` nunca entram
  na lista: servem só de parceiros na comparação do `RESPONSIBLE_OVERLAP`. Se algum agendamento for
  afetado, a transação faz `ROLLBACK` e responde `409 SCHEDULE_CONFLICTS` com `{ details: { conflicts } }`.
  Códigos:
  - `DATE_BLOCKED`, `PERIOD_BLOCKED`, `DAY_WITHOUT_SERVICE`, `DURATION_CHANGED` e `RANGE_CHANGED`;
  - `SEATS_REDUCED` para os agendamentos excedentes, ordenados por `request_datetime ASC, id ASC`
    (perde a vaga quem pediu por último);
  - `RESPONSIBLE_OVERLAP`: dois agendamentos `CONFIRMED` do mesmo responsável (`assigned_user_id`) que
    não se sobrepunham com a duração atual passam a se sobrepor com a nova (mesma regra de
    `services/responsibleAvailability.ts`). Só acontece quando a duração aumenta. Entra o agendamento
    que não é `off_grid`, uma vez só, apontando o parceiro de horário mais cedo (empate pelo `id`
    menor) em `conflictingAppointmentId` e `conflictingProtocol`. Se um dos dois já está na lista por
    outro código, nada é acrescentado. O item não traz `cpf_hash` nem o id do responsável.

  ```json
  {
      "id": "41",
      "protocol": "A1B2C3D4",
      "name": "Maria Souza",
      "cpfMasked": "***.982.247-**",
      "appointmentDatetime": "2026-11-04T12:00:00.000Z",
      "date": "2026-11-04",
      "time": "09:00",
      "status": "CONFIRMED",
      "reason": "Responsável com outro agendamento sobreposto com atendimentos de 60 minutos (protocolo E5F6A7B8)",
      "code": "RESPONSIBLE_OVERLAP",
      "conflictingAppointmentId": "42",
      "conflictingProtocol": "E5F6A7B8"
  }
  ```

  O fluxo de resolução no mesmo salvamento (cancelar pelo Procon ou manter como `off_grid = TRUE`)
  pertence à #75.

- **Conflitos na prévia (#125):** `MonthlyPreviewResult` traz também `conflicts`, no `GET` e no
  `POST /api/v1/schedule/preview`. O service lê os agendamentos futuros ativos **uma vez e sem trava**
  (`listFutureActiveAppointments(now)` no repositório, o mesmo `SELECT` do `saveConfig` sem
  `FOR UPDATE`) e chama `detectScheduleConflicts(configuração, agendamentos, duraçãoAtual)`, a mesma
  função do `PUT`. No `GET`, cada versão salva é conferida com os agendamentos da própria vigência, com
  a própria duração como a atual (normalmente sem conflitos); no `POST`, o rascunho é conferido com os
  agendamentos da vigência dele, com a duração da versão anterior como a atual. Os conflitos não dependem do `month`: cobrem todos os agendamentos
  futuros. Cada item é recortado para protocolo, data, hora, status, código e motivo, sem nome, CPF,
  telefone, id do agendamento ou do responsável. A ordem é a do `409`. A leitura sem trava é só aviso:
  a garantia continua no `409` do `PUT`.

  ```json
  {
      "protocol": "A1B2C3D4",
      "date": "2026-11-04",
      "time": "09:00",
      "status": "CONFIRMED",
      "code": "RANGE_CHANGED",
      "reason": "Faixa de horário removida ou alterada"
  }
  ```

- **Dias com agendamento (#125):** `GET /api/v1/schedule/booked-days` não recebe parâmetro e devolve os
  dias e horários com agendamento futuro, para a tela travar antes de salvar o que afetaria alguém.
  Conta como agendamento futuro o que tem `status IN ('PENDING', 'CONFIRMED')`,
  `appointment_datetime > agora` e `off_grid = FALSE` (os fora da grade nunca são apontados como
  afetados). `date` (`AAAA-MM-DD`) e `time` (`HH:MM`) são de `America/Sao_Paulo`, e `weekday` vai de
  `0` (domingo) a `6`. `days` vem em ordem de data, `times` em ordem de hora e `total` é a soma dos
  `count` do dia; sem agendamento futuro, `days: []`. A resposta não traz id, protocolo, nome, CPF,
  telefone nem responsável.

  ```json
  {
      "data": {
          "days": [
              {
                  "date": "2026-11-04",
                  "weekday": 3,
                  "total": 2,
                  "times": [
                      { "time": "09:00", "count": 1 },
                      { "time": "10:30", "count": 1 }
                  ]
              }
          ]
      }
  }
  ```

## Agendamento pelo chat (#56)

Quando o cidadão aceita a oferta de agendamento (`schedule_yes` em `AWAITING_SCHEDULE_OFFER`), o
fluxo da conversa (`services/conversationFlow.service.ts`) passa as etapas abaixo para
`services/schedulingFlow.service.ts` (`createSchedulingFlow`). Os encerramentos fora de transação
passam por `services/conversationClosing.service.ts` (`finishOrLog`), e os tipos do fluxo ficam em
`types/conversationFlow.types.ts`.

| Etapa | O que o bot espera | Próxima etapa |
| --- | --- | --- |
| `AWAITING_ATTENDEE` | botão `attendee_self` (titular) ou `attendee_rep` (representante). Grava `ATTENDEE_CHOSEN` | `AWAITING_HOLDER_NAME` |
| `AWAITING_HOLDER_NAME` | nome do titular (regra abaixo) | `AWAITING_HOLDER_CPF` |
| `AWAITING_HOLDER_CPF` | CPF válido, com ou sem pontuação. Vai para o rascunho só como hash e máscara | `AWAITING_SLOT` (ou encerra com `NO_SLOT` se não houver horário) |
| `AWAITING_SLOT` | linha `slot_<ISO 8601 UTC>` da lista ou `page_<n>` para paginar | `FINISHED` com desfecho `SCHEDULED` |
| `AWAITING_SLOT` com `draft.target_appointment_id` (remarcação, #59) | linha `slot_<ISO 8601 UTC>` da lista sem o horário atual do agendamento, ou `page_<n>` | `FINISHED` com desfecho `MANAGED_APPOINTMENT` |
| `AWAITING_RETURN_CHOICE` (#59) | botão `return_reschedule`, `return_cancel` ou `return_other`, ou o texto `1`, `2` ou `3` | `AWAITING_SLOT`, `AWAITING_CANCEL_CONFIRMATION` ou `AWAITING_CATEGORY` |
| `AWAITING_CANCEL_CONFIRMATION` (#59) | botão `cancel_yes` ou `cancel_no`, ou o texto exato `1`/`sim` ou `2`/`não`/`nao` | `FINISHED` com desfecho `MANAGED_APPOINTMENT`, ou volta a `AWAITING_RETURN_CHOICE` |

O rascunho fica em `Sessions.draft`, com as chaves `by_representative`, `holder_name`, `cpf_hash` e
`cpf_masked` na reserva, e só `target_appointment_id` no retorno de quem já tem agendamento (#59, seção
abaixo). O `chk_sessions_draft_keys` recusa qualquer outra.
O motivo do agendamento (`REQUIRES_IN_PERSON` ou `NOT_RESOLVED`) é o do último `SCHEDULE_OFFERED`
da sessão registrado depois da última pergunta escolhida (`QUESTION_CHOSEN`), lido na reserva por
`services/scheduleOfferReason.ts`. Assim o agendamento guarda o motivo que o bot mostrou na oferta,
mesmo se a pergunta mudar no painel antes do clique no horário. Só quando esse evento não existe ou a
leitura dos eventos falha o motivo é recalculado pela pergunta da sessão; na falha de leitura, o log
traz só `{ type, sessionId, code }`.

**Regra do nome.** O bot aplica `trim()` e `normalize("NFC")`, exige de 2 a 150 caracteres e aceita
só letras de qualquer alfabeto (inclusive `º` e `ª`, que o Unicode trata como letras), marcas de
acentuação, espaço comum, apóstrofo reto e curvo, ponto, vírgula e hífen
(`/^[\p{L}\p{M} '’.,-]+$/u`), com ao menos uma letra (`/\p{L}/u`). O nome é gravado já normalizado.
Dígitos (também os de largura total), `@`, `_`, parênteses, barra, `&` e emoji são recusados, o que
impede que um CPF digitado no lugar do nome seja gravado. Também são recusados o nome só de
pontuação (`..`, `- -`, `''`) e a quebra de linha ou a tabulação no meio do nome: entre as palavras,
só o espaço comum.

| Situação | Mensagem (`services/messageFormatter.service.ts`) | Etapa seguinte |
| --- | --- | --- |
| Botão de quem comparece inválido | `ERRO_ATTENDEE` | `AWAITING_ATTENDEE` |
| Nome recusado | `ERRO_NOME`: "Por favor, digite o nome completo usando apenas letras (entre 2 e 150 caracteres):" | `AWAITING_HOLDER_NAME` |
| CPF inválido | `ERRO_CPF` | `AWAITING_HOLDER_CPF` |
| Nenhum horário livre (ao listar ou depois de um horário lotado) | `MENSAGEM_SEM_HORARIOS`; encerra com `NO_SLOT` | `FINISHED` |
| Texto ou opção que não é da lista | `ERRO_SLOTS` com a página atual | `AWAITING_SLOT` |
| Horário lotado (`SlotFullError`, que vale também para o horário que saiu da grade ou foi bloqueado por um salvamento de `PUT /api/v1/schedule` durante a reserva) ou `slot_` que não está mais na lista | `ERRO_SLOT_OCUPADO` com a lista atualizada, voltando à página 1 | `AWAITING_SLOT` |
| Já existe agendamento ativo do mesmo CPF no mesmo horário (`DuplicateAppointmentError`) | `ERRO_DUPLICATE_APPOINTMENT` com a página atual | `AWAITING_SLOT` |
| Rascunho incompleto ou pergunta inválida | `MENSAGEM_RASCUNHO_INCOMPLETO`; o rascunho é limpo | `AWAITING_ATTENDEE` |
| Qualquer outra falha da reserva (inclusive `ScheduleNotConfiguredError` e `BookingFailedError`) | `ERRO_FALHA_AGENDAMENTO` ("O agendamento não foi gravado"); o log leva só o tipo do evento, o id da sessão e o código do erro | `AWAITING_SLOT` |

A reserva (`bookAppointment` em `repositories/schedule.repository.ts`) roda numa transação, nesta
ordem: trava compartilhada da agenda (`pg_advisory_xact_lock_shared(hashtext('schedule_config'))`, que
só espera um salvamento de `PUT /api/v1/schedule` em andamento; reservas não esperam umas pelas
outras), trava do horário (`pg_advisory_xact_lock`), leitura da configuração, conferência de que o
horário ainda existe na grade atual (faixas, bloqueios e duração lidos na mesma transação, por
`freeSlotStartsOfDay`; se não existe, `SlotFullError`, e o bot oferece a lista atualizada), recontagem das vagas,
checagem de duplicidade por CPF e horário, documentos, `INSERT` do agendamento (telefone cifrado com
`ENCRYPTION_KEY`), evento `CREATED` em `AppointmentEvents`, `PHONE_NOTICE_SHOWN` por
`insertConversationEvent(client, ...)` e encerramento por `finishSessionWith(client, ...)` com
`APPOINTMENT_CREATED`/`SCHEDULED`. Qualquer falha desfaz tudo.


## Retorno de quem já tem agendamento (#59)

Quando uma mensagem abre uma sessão nova, `services/returnFlow.service.ts` (`createReturnFlow`) procura
um agendamento `PENDING` ou `CONFIRMED` com horário futuro cuja sessão de origem tem o mesmo `phone_hash`
(`scheduleRepository.findReturningAppointment`, só pelo HMAC, sem ler `phone_encrypted`). Se achar,
grava `APPOINTMENT_CONSULTED`, guarda o id em `draft.target_appointment_id` e responde com o menu
**Remarcar / Cancelar / Tenho outra dúvida**, em botões com o rodapé curto
`Orientação informativa · Privacidade (LGPD) protegida` (`RODAPE_RETORNO`, enviado pelo Gateway em
`interactive.footer.text`). Sem agendamento, ou se a consulta falhar (log
`Failed to read returning appointment`), a sessão segue para a lista de categorias como antes. Sessões
que já estavam em andamento não consultam.

- **Tenho outra dúvida**: lista de categorias, com o rascunho zerado.
- **Cancelar**: pede confirmação por botão (`cancel_yes`/`cancel_no`; a confirmação não usa a heurística
  de "agendar"). "Não, manter" volta ao menu. "Sim, cancelar" chama `scheduleRepository.cancelByCitizen`.
- **Remarcar**: oferece `getAvailableSlots()` sem o horário atual do agendamento. Sem outro horário,
  responde `SEM_HORARIOS_REMARCACAO` e volta ao menu, sem desfecho. Na escolha, chama
  `scheduleRepository.rescheduleByCitizen` e responde a confirmação com o título "Agendamento remarcado",
  o mesmo protocolo, os documentos guardados no agendamento e o endereço e o lembrete da agenda do novo
  dia.

A cada clique o agendamento é conferido de novo pelo `phone_hash`. Se não for mais o mesmo (cancelado
pela equipe, já passou, rascunho inválido) ou a transação recusar com `AppointmentNotChangeableError`
(409, `APPOINTMENT_NOT_CHANGEABLE`), o bot responde "Este agendamento não pode mais ser alterado pelo
chatbot..." e mostra a lista de categorias. Falha inesperada fica no log como
`Failed to change appointment` (só `{ type, sessionId, code }`), o cidadão recebe a mensagem de
instabilidade e a etapa não muda.

As duas alterações rodam numa transação que também encerra a sessão (`finishSessionWith`, desfecho
`MANAGED_APPOINTMENT`). Se qualquer passo falhar, tudo volta.

| Alteração | Passos na transação |
| --- | --- |
| Cancelar | `SELECT ... FOR UPDATE OF a` do agendamento com `JOIN Sessions`, conferindo `phone_hash`, status ativo e horário futuro → `status = 'CANCELED'` (o responsável fica) → `CANCELED_BY_CITIZEN` com `actor_user_id NULL` e `{}` → `APPOINTMENT_CANCELED` |
| Remarcar | `pg_advisory_xact_lock_shared` da agenda → trava consultiva do novo horário → `SELECT ... FOR UPDATE OF a` do agendamento (mesma conferência) → horário na grade do novo dia e com vaga (`SlotFullError`) → mesmo CPF já ativo no novo horário (`DuplicateAppointmentError`) → `appointment_datetime` novo e `rescheduled_from = COALESCE(rescheduled_from, antigo)` → `RESCHEDULED` `{ from, to }` → se estava `CONFIRMED`, `BACK_TO_PENDING` `{ "reason": "RESCHEDULED" }` sem responsável → `APPOINTMENT_RESCHEDULED` `{ appointmentId, from, to }` |

A ordem das travas da remarcação é a mesma da reserva (agenda compartilhada → horário → linha), então
não cruza com o salvamento da grade nem com o cancelamento da equipe (que trava a conta e depois a linha).
Os eventos do agendamento não guardam nome, CPF, telefone nem texto do cidadão.

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
| `insertConversationEvent(client, sessionId, event)` | `repositories/conversationEvent.repository.ts` | Evento comum dentro de uma transação aberta (ex.: `PHONE_NOTICE_SHOWN` na reserva da #56) |
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
| `RESOLVED` | `RESOLVED_ANSWERED` com `resolved: true`, conferido em `isClosingCompatible` (`utils/conversationEventData.ts`) |
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
| Aviso de mensagens neste número | #56 | `insertConversationEvent(client, ...)` na transação da reserva, logo antes do encerramento | `PHONE_NOTICE_SHOWN` | — |
| Agendamento criado | #56 | `finishSessionWith(client, ...)` na transação da reserva; se falhar, a reserva volta e o cidadão é avisado | `APPOINTMENT_CREATED` | `SCHEDULED` |
| Consultou agendamento | #59 | `record` | `APPOINTMENT_CONSULTED` | — |
| Remarcou / cancelou | #59 | `finishSessionWith(client, ...)` na transação da alteração; se falhar, a alteração volta e o cidadão é avisado | `APPOINTMENT_RESCHEDULED` / `APPOINTMENT_CANCELED` | `MANAGED_APPOINTMENT` |
| 30 min sem interação | #16 na próxima mensagem do mesmo número; varredura periódica (`services/abandonedSessionsSweep.service.ts`) | — | `ABANDONED` | `ABANDONED` |

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
| Encerramento com `finish`, fora da transação de um agendamento (`OUT_OF_SCOPE` com `ANSWER_SENT`, `RESOLVED` com `RESOLVED_ANSWERED`, `DECLINED`, `NO_SLOT`), por `finishOrLog` (`services/conversationClosing.service.ts`) | `finish` lança. O fluxo registra no log do mesmo jeito e entrega a resposta; a sessão continua `IN_PROGRESS`, sem evento de fechamento, e será abandonada pelo timeout |
| Criação do agendamento e encerramentos ligados a ele (`PHONE_NOTICE_SHOWN`, `APPOINTMENT_CREATED`/`SCHEDULED`, `APPOINTMENT_RESCHEDULED`/`APPOINTMENT_CANCELED`/`MANAGED_APPOINTMENT`) | `insertConversationEvent(client, ...)` e `finishSessionWith(client, ...)` na mesma transação da reserva ou da alteração. Se a reserva, o evento ou o encerramento falhar, a transação inteira volta e o cidadão recebe uma mensagem clara de que o agendamento **não** foi gravado. A mensagem e o tratamento são do fluxo da #56 (e da #59 no retorno) |

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

Esta regra roda quando o mesmo número volta a escrever. A **varredura periódica**
(`services/abandonedSessionsSweep.service.ts`, iniciada em `index.ts`) cuida das sessões de quem nunca
volta e aplica exatamente a mesma regra. A correspondência entre
etapa e os nomes de abandono dos Relatórios é da #68.
