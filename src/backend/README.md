# ProconChat — Backend

Backend do chatbot de orientação ao consumidor via WhatsApp (PROCON Jacareí). Express + TypeScript, em camadas Route → Controller → Service → Repository.

## Estrutura de pastas

- `app.ts` — monta a aplicação Express: middlewares globais (helmet, cors, json), validação de variáveis de ambiente, logger de requisição, rotas e o middleware de erro central. Não contém lógica de negócio.
- `index.ts` — ponto de entrada: sobe o servidor HTTP na porta configurada, trata `uncaughtException`/`unhandledRejection` e faz o encerramento gracioso do processo em `SIGTERM`/`SIGINT`.
- `routes/` — cada recurso tem uma classe `XRoutes` que cria o controller, registra os caminhos com `metodo.bind(controller)` e exporta o `Router` por `getRouter()` (ex.: `health.routes.ts`, `auth.routes.ts`).
- `controllers/` — cada controller é uma classe com as dependências injetadas pelo constructor (com valor padrão apontando para a instância já montada do service) e métodos `(req, res, next)` (ex.: `auth.controller.ts`, `whatsappSession.controller.ts`; o `health.controller.ts` não recebe dependências). Recebe a requisição HTTP, valida entrada básica, chama o service e formata a resposta (envelope `{ data }` ou erro via `next(error)`). Não acessa o banco diretamente.
- `services/` — contém a lógica de negócio de cada recurso, sem depender do objeto `Request`/`Response` do Express. O service é criado por fábrica (`createXService({ ... })`) e exporta uma instância já montada (ex.: `createAuthService` e `authService` em `auth.service.ts`). O `HealthService` em classe é a exceção histórica.
- `repositories/` — contratos e adaptadores de persistência; concentra o SQL e isola os services do PostgreSQL.
- `errors/` — hierarquia de erros da aplicação: `AppError` (abstrata) e subclasses por status HTTP: `BadRequestError` (400), `InvalidCurrentPasswordError` (400 `INVALID_CURRENT_PASSWORD`), `UnauthorizedError` (401), `ForbiddenError` (403), `InvalidOriginError` (403 `INVALID_ORIGIN`), `NotFoundError` (404), `ConflictError` (409, código configurável), `DuplicateAppointmentError` (409 `DUPLICATE_APPOINTMENT`), `SlotFullError` (409 `SLOT_FULL`), `WhatsAppConnectionError` (422, com o `reason` do teste como código), `TooManyRequestsError` (429), `InternalServerError` (500), `BookingFailedError` (500 `BOOKING_FAILED`) e `ScheduleNotConfiguredError` (500 `SCHEDULE_NOT_CONFIGURED`). Lançar/`next()` uma dessas classes é o jeito padrão de sinalizar um erro esperado.
- `middleware/` — middlewares do Express: `requestLogger.middleware.ts` (log estruturado por requisição, sem corpo nem cookies), `errorHandler.middleware.ts` (converte qualquer erro numa resposta JSON padronizada; corpo JSON malformado vira `400 BAD_REQUEST`), `trustedOrigin.middleware.ts` (proteção CSRF) e `auth.middleware.ts` (`requireAuth` e `requirePermission`).
- `types/` — DTOs e formatos de resposta compartilhados (`successResponse.types.ts`, `errorResponse.types.ts`, tipos específicos de cada recurso).
- `utils/` — utilitários que não pertencem a nenhum recurso específico, ex.: `validateEnv.ts` (validação de variáveis de ambiente obrigatórias na inicialização).
- `db/` — `connection.ts`, conexão ao PostgreSQL (via `pg`) usada pelos repositórios; também `migrations/`, `schema/`, `seeds/`, `scripts/` e `verify-migrations.cjs`.

## Padrão para adicionar um novo recurso

- Service em fábrica: `services/<recurso>.service.ts` com `createXService({ ... })` e a instância padrão exportada.
- Controller em classe, com as dependências injetadas pelo constructor e valor padrão apontando para a instância do service, como `controllers/auth.controller.ts` ou `controllers/whatsappSession.controller.ts`. O `controllers/health.controller.ts` serve só de modelo de formato (classe, campo `private`, `export default` no fim) e não injeta nada. Variáveis de ambiente são lidas na requisição, nunca no constructor.
- Rotas em classe, como `routes/health.routes.ts`, exportando o `Router` de `getRouter()`.
- Montagem em `app.ts`, sob o prefixo `/api/v1` (exceto casos como `/health`, que ficam fora do versionamento por serem consumidos por infraestrutura).
- Teste unitário do controller em `controllers/<recurso>.controller.test.ts`: instancia a classe com dublês, monta `req`/`res`/`next` falsos e chama os métodos direto, sem `supertest` (ex.: `controllers/auth.controller.test.ts`).
- Teste de montagem em `routes/<recurso>.routes.test.ts` com `supertest` contra o `app` exportado por `app.ts`, principalmente para caminho, middlewares e ordem, CORS, CSRF, cabeçalhos e envelope de erro (ex.: `routes/health.routes.test.ts`). Temas maiores ficam em arquivos irmãos `routes/<recurso>.<tema>.test.ts` (ex.: `auth.endpoints`, `auth.loginLimiter`, `auth.sessionLifetime`, `auth.frontendOrigin`). O dublê de uma dependência num teste de rota entra por `vi.mock` ou por injeção no constructor, não por `vi.spyOn` na exportação do módulo, porque o controller guarda o service padrão quando é construído.

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
| `ENCRYPTION_KEY` | Sim, exatamente 64 caracteres hexadecimais | Chave-mestra AES-256-GCM dos segredos guardados no banco (`utils/crypto.utils.ts`, formato `v1:<iv>:<tag>:<cifrado>`). Gere com `openssl rand -hex 32`. O servidor encerra na inicialização sem ela ou fora do formato, e o `seed` falha se precisar cifrar algo sem ela. Não tem valor padrão em nenhum Compose: sem ela no `.env`, o `docker compose` recusa subir. |
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
```

Rode `npm run test:integration` num **banco separado**, só com as migrations aplicadas (sem o
seed), como faz o CI. O teste da configuração do WhatsApp (#83) apaga a linha de `WhatsAppSettings`
durante a execução e a restaura no fim; se a execução for interrompida, a linha do banco usado pode
ficar perdida. Os testes de eventos da conversa também esperam um banco sem o conteúdo do seed.
Por exemplo, com o Postgres do Compose:

```bash
docker compose exec postgres psql -U proconchat -d proconchat -c "CREATE DATABASE proconchat_test"
export DB_URL=postgresql://proconchat:<POSTGRES_PASSWORD>@localhost:5433/proconchat_test
npm run db:migrate
npm run test:integration
```

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
- Na Sprint 2 só a conta Admin (`is_admin`) recebe as 8. As permissões das outras contas são da #62.
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
  senha. Sem conta Admin, sai com código 1 e pede para rodar o seed. Em produção, veja
  `.docs/infra/deploy.md`.

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

## Agendamentos (/api/v1/appointments)

Rotas de consulta e ações sobre agendamentos presenciais no painel administrativo, protegidas por autenticação via cookie (`requireAuth`) e permissões (`requirePermission`).

### Rotas

| Rota | Permissão | Descrição / Parâmetros | Sucesso | Erros |
| --- | --- | --- | --- | --- |
| `GET /api/v1/appointments/pending-count` | `appointments.view` | Retorna a quantidade de agendamentos com status `PENDING` | `200 { data: { count: number } }` | `401 UNAUTHORIZED`, `403 FORBIDDEN` |
| `GET /api/v1/appointments` | `appointments.view` | Lista com filtros, busca, ordenação e paginação (20 por padrão). Query: `search` (mín. 2 chars), `status` (chips: `all`, `PENDING`, `CONFIRMED`, `ATTENDED`, `NO_SHOW`, `CANCELED`, `waiting_record`), `period` (`all`, `today`, `this_week`, `upcoming`, `past`), `responsible` (`all`, `unassigned`, `me`, ID numérico), `sortBy`, `sortOrder`, `page`, `limit` | `200 { data: { items: AppointmentListItem[], total, page, limit, totalPages, chipCounts } }` | `400 BAD_REQUEST`, `401 UNAUTHORIZED`, `403 FORBIDDEN` |
| `GET /api/v1/appointments/:id` | `appointments.view` | Detalhe completo de um agendamento com histórico de eventos e linha do tempo de origem | `200 { data: AppointmentDetail }` | `400 BAD_REQUEST` (ID inválido/fora do limite bigint), `401`, `403`, `404 NOT_FOUND` |
| `PATCH /api/v1/appointments/:id/status` | `appointments.manage` | Executa ação de status: `{ action: "claim" | "attended" | "no_show" }` | `200 { data: AppointmentDetail }` | `400 BAD_REQUEST`, `401`, `403`, `404 NOT_FOUND`, `409 CONFLICT` (códigos: `APPOINTMENT_ALREADY_CLAIMED`, `ALREADY_ATTENDED`, `ALREADY_NO_SHOW`, `APPOINTMENT_CANCELED`, `INVALID_STATUS_TRANSITION`) |

### Regras de Negócio e Concorrência

- **Busca por CPF:** Busca por CPF compara o HMAC SHA-256 com `CPF_HASH_SECRET`. CPF formatado (`111.444.777-35`) tem pontuações removidas para busca precisa sem expor dados.
- **Precedência de Ordenação:** O chip de status tem precedência sobre o período selecionado: com `period=all`, Cancelados, Atendidos e Não compareceu saem do mais recente para o mais antigo; Pendentes, Confirmados e Aguardando registro saem do mais próximo para o mais distante.
- **Concorrência atômica:** Ações de status usam `SELECT ... FOR UPDATE` para travar o registro do agendamento. Se duas ações simultâneas ocorrerem (ex.: Atendido e Não compareceu, ou duas ações de Assumir simultâneas), a segunda requisição identifica a transição inválida e retorna `409 CONFLICT` (`AppError`), garantindo que apenas um evento terminal seja registrado no banco.

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
| `RESOLVED` | `RESOLVED_ANSWERED` com `resolved: true` (`isClosingCompatible`, `utils/conversationEventData.ts`) |
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
| Encerramento com `finish`, fora da transação de um agendamento (por exemplo `OUT_OF_SCOPE` com `ANSWER_SENT` e `RESOLVED` com `RESOLVED_ANSWERED`) | `finish` lança. O fluxo registra no log do mesmo jeito e entrega a resposta; a sessão continua `IN_PROGRESS`, sem evento de fechamento, e será abandonada pelo timeout |
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

Além da próxima mensagem do mesmo número, a **varredura periódica**
(`services/abandonedSessionsSweep.service.ts`, a cada 60 s, iniciada em `index.ts`) aplica
exatamente a mesma regra às sessões de quem nunca volta (`session.repository.ts`). A correspondência
entre etapa e os nomes de abandono dos Relatórios é da #68.
