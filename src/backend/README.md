# ProconChat — Backend

Backend do chatbot de orientação ao consumidor via WhatsApp (PROCON Jacareí). Express + TypeScript, seguindo o padrão Controller → Service → Route.

## Estrutura de pastas

- `app.ts` — monta a aplicação Express: middlewares globais (helmet, cors, json), validação de variáveis de ambiente, logger de requisição, rotas e o middleware de erro central. Não contém lógica de negócio.
- `index.ts` — ponto de entrada: sobe o servidor HTTP na porta configurada, trata `uncaughtException`/`unhandledRejection` e faz o encerramento gracioso do processo em `SIGTERM`/`SIGINT`.
- `routes/` — define os endpoints HTTP de cada recurso e delega para o controller correspondente (ex.: `health.routes.ts`).
- `controllers/` — recebe a requisição HTTP, valida entrada básica, chama o service e formata a resposta (envelope `{ data }` ou erro via `next(error)`). Não acessa o banco diretamente.
- `services/` — contém a lógica de negócio de cada recurso, sem depender do objeto `Request`/`Response` do Express.
- `repositories/` — contratos e adaptadores de persistência; concentra o SQL e isola os services do PostgreSQL.
- `errors/` — hierarquia de erros da aplicação: `AppError` (abstrata) e subclasses por status HTTP (`BadRequestError`, `NotFoundError`, `InternalServerError`). Lançar/`next()` uma dessas classes é o jeito padrão de sinalizar um erro esperado.
- `middleware/` — middlewares do Express: `requestLogger.middleware.ts` (log estruturado por requisição), `errorHandler.middleware.ts` (converte qualquer erro numa resposta JSON padronizada) e `token.middleware.ts` (sessão autenticada e autorização por permissão).
- `types/` — DTOs e formatos de resposta compartilhados (`successResponse.types.ts`, `errorResponse.types.ts`, tipos específicos de cada recurso).
- `utils/` — utilitários que não pertencem a nenhum recurso específico, ex.: `validateEnv.ts` (validação de variáveis de ambiente obrigatórias na inicialização).
- `db/` — `connection.ts`, conexão genérica ao PostgreSQL (via `pg`). Ainda não é usada por nenhuma rota — fica pronta para o primeiro recurso real que precisar de acesso ao banco.

## Padrão para adicionar um novo recurso

Copie o padrão do `health`: crie `services/<recurso>.service.ts`, `controllers/<recurso>.controller.ts`, `routes/<recurso>.routes.ts`, monte a rota em `app.ts` (sob o prefixo `/api/v1`, exceto casos como `/health` que ficam fora do versionamento por serem consumidos por infraestrutura) e um teste co-localizado `routes/<recurso>.routes.test.ts` usando `supertest` contra o `app` exportado por `app.ts`.

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DB_URL` | Sim | String de conexão do PostgreSQL (`pg`). O servidor falha na inicialização com uma mensagem clara se ela não estiver definida. |
| `PORT` | Não (padrão `3000`) | Porta em que o servidor Express escuta. |
| `FRONTEND_ORIGIN` | Não (padrão `http://localhost:5173`) | Origem autorizada do painel; CORS permite credenciais para o cookie de sessão. |
| `PHONE_HASH_SECRET` | Sim | Segredo HMAC usado para que o telefone nunca seja persistido em texto puro. |
| `GATEWAY_INTERNAL_TOKEN` | Sim | Token esperado no header `X-Internal-Token` das chamadas do Gateway WhatsApp (`src/gateway/`) a `POST /api/v1/whatsapp/sessions`. |
| `AUTH_TOKEN_SECRET` | Sim | Segredo aleatório com pelo menos 32 caracteres para assinar os tokens de sessão. |
| `ADMIN_EMAIL` | No seed | E-mail da conta Admin inicial. |
| `ADMIN_PASSWORD` | No seed | Senha inicial da conta Admin, com pelo menos 8 caracteres. |

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

Configure `ADMIN_EMAIL` e `ADMIN_PASSWORD` antes de executar `npm run db:seed`. O seed cria
a conta Admin uma única vez, armazena a senha com bcrypt e não redefine credenciais existentes.
Senhas devem ter no mínimo 8 caracteres. `AUTH_TOKEN_SECRET` deve ser um segredo aleatório de
pelo menos 32 caracteres.

- `POST /api/v1/auth/login` recebe `{ email, password }` e inicia uma sessão.
- `POST /api/v1/auth/logout` encerra a sessão atual.
- `GET /api/v1/auth/me` retorna os dados do usuário e suas permissões.
- `POST /api/v1/auth/change-password` recebe `{ currentPassword, newPassword }`; a nova senha
  exige no mínimo 8 caracteres. As sessões anteriores são invalidadas.

A sessão é um JWT em cookie `HttpOnly`, `SameSite=Strict`, com validade de 8 horas e flag
`Secure` em produção. O logout e a troca de senha incrementam `session_version`, revogando
tokens anteriores. O login bloqueia temporariamente o IP após cinco falhas em 15 minutos; esse
limitador em memória é local ao processo e pode ser substituído por armazenamento compartilhado
ao escalar horizontalmente.

As oito chaves suportadas por `requirePermission` estão definidas em
`types/auth.types.ts`. Nesta sprint o Admin recebe todas; usuários sem a permissão recebem 403.
Use `requireAuth` antes de `requirePermission(...)` nas rotas protegidas. A autorização de
permissões individuais para funcionários depende das tabelas/gestão previstas para a Sprint 3.
