# ProconChat — Backend

Backend do chatbot de orientação ao consumidor via WhatsApp (PROCON Jacareí). Express + TypeScript, seguindo o padrão Controller → Service → Route.

## Estrutura de pastas

- `app.ts` — monta a aplicação Express: middlewares globais (helmet, cors, json), validação de variáveis de ambiente, logger de requisição, rotas e o middleware de erro central. Não contém lógica de negócio.
- `index.ts` — ponto de entrada: sobe o servidor HTTP na porta configurada, trata `uncaughtException`/`unhandledRejection` e faz o encerramento gracioso do processo em `SIGTERM`/`SIGINT`.
- `routes/` — define os endpoints HTTP de cada recurso e delega para o controller correspondente (ex.: `health.routes.ts`).
- `controllers/` — recebe a requisição HTTP, valida entrada básica, chama o service e formata a resposta (envelope `{ data }` ou erro via `next(error)`). Não acessa o banco diretamente.
- `services/` — contém a lógica de negócio de cada recurso, sem depender do objeto `Request`/`Response` do Express.
- `repositories/` — contratos e adaptadores de persistência; concentra o SQL e isola os services do PostgreSQL.
- `gateways/` — contratos e adaptadores de serviços externos, como o envio de mensagens pela Evolution API.
- `errors/` — hierarquia de erros da aplicação: `AppError` (abstrata) e subclasses por status HTTP (`BadRequestError`, `NotFoundError`, `InternalServerError`). Lançar/`next()` uma dessas classes é o jeito padrão de sinalizar um erro esperado.
- `middleware/` — middlewares do Express: `requestLogger.middleware.ts` (log estruturado por requisição) e `errorHandler.middleware.ts` (converte qualquer erro numa resposta JSON padronizada).
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
| `PHONE_HASH_SECRET` | Sim | Segredo HMAC usado para que o telefone nunca seja persistido em texto puro. |
| `EVOLUTION_API_URL` | Para envio | URL interna ou externa da Evolution API. |
| `EVOLUTION_API_KEY` | Para envio | Chave enviada no header `apikey` da Evolution API. |
| `EVOLUTION_WEBHOOK_TOKEN` | Sim | Token da URL interna usado para autenticar webhooks recebidos. |
| `EVOLUTION_AUTO_REPLY_ENABLED` | Não (padrão `false`) | Envia uma saudação apenas ao abrir uma sessão nova. Deixe desligado até integrar o motor de decisão. |

## Como rodar

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

`POST /api/v1/webhooks/evolution` recebe eventos `messages.upsert`, ignora grupos e mensagens
enviadas pelo próprio bot, cria ou reutiliza uma sessão e guarda somente o HMAC do telefone.
