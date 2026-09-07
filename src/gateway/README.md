# Gateway WhatsApp (Evolution API)

App própria (Express + TypeScript), extraída de `src/backend/` (issue #4), que fala com a
Evolution API e repassa eventos ao Backend. Não acessa o Postgres nem conhece `PHONE_HASH_SECRET`
— autentica-se no Backend via `X-Internal-Token` (`GATEWAY_INTERNAL_TOKEN`) chamando
`POST /api/v1/whatsapp/sessions` (`clients/backend.client.ts`).

A Evolution API e os demais serviços não devem ser executados por arquivos Compose separados. O
arquivo [`compose.yaml`](../../compose.yaml) na raiz é a fonte única de configuração e sobe:

- `postgres` (porta `5433` do host) e `migrate` (roda as migrations e sai);
- `redis` (porta `6379`);
- `evolution-api` (porta `8080`);
- `backend` (porta `3000`);
- `gateway` (porta `3001`).

O PostgreSQL é compartilhado no mesmo servidor, mas os dados ficam separados: o backend usa o
schema `public` e a Evolution usa o schema `evolution`. A Evolution encaminha eventos
`messages.upsert` para `POST /webhooks/evolution` **neste Gateway**, que por sua vez chama
`POST /api/v1/whatsapp/sessions` no backend.

## Pré-requisitos

- Docker Desktop (ou Docker Engine) com Docker Compose;
- WSL 2 habilitado, se estiver no Windows;
- Git;
- Node.js 20+ (só necessário para rodar fora do Docker).

## 1. Primeira execução

Na raiz do repositório:

```bash
cp .env.example .env
docker compose up --build -d
docker compose ps
```

No PowerShell, use `Copy-Item .env.example .env` no lugar de `cp`.

Devem aparecer cinco serviços: `postgres`, `redis`, `evolution-api`, `backend`, `gateway` (mais o
`migrate`, que roda uma vez e sai com código `0`). `postgres`, `redis`, `backend` e `gateway`
aparecem como `healthy`; `evolution-api` aparece como `Up`.

Troque as chaves e senhas do `.env` antes de qualquer ambiente compartilhado. As credenciais do
PostgreSQL são aplicadas na criação inicial do volume — não altere só a senha depois que o banco já
tiver dados. A resposta automática fica desligada por padrão (`EVOLUTION_AUTO_REPLY_ENABLED=false`)
até o motor de decisão ser conectado ao webhook.

## 2. Endereços locais

- Backend: http://localhost:3000 (`GET /health`)
- Gateway: http://localhost:3001 (`GET /health`)
- Evolution API: http://localhost:8080
- Evolution Manager: http://localhost:8080/manager
- PostgreSQL: `localhost:5433`
- Redis: `localhost:6379`

## 3. Se modificar o Gateway ou o Backend

```bash
docker compose up --build -d gateway
docker compose up --build -d backend
```

## 4. Testes automatizados

Isolados por app, sem depender de `node_modules`/`tsconfig` um do outro:

```bash
cd src/gateway
npm install
npm test
npm run build
cd ../backend
npm install
npm test
npm run build
```

O teste de integração do Backend usa o PostgreSQL do Compose e remove os próprios dados ao
terminar:

```bash
docker compose --profile test run --rm --build backend-tests
```

## 5. Teste manual do webhook sem WhatsApp

Chama o Gateway diretamente, sem depender de uma instância conectada, e confirma a idempotência de
sessão de ponta a ponta (Gateway → Backend → Postgres):

```bash
curl -s -X POST "http://localhost:3001/webhooks/evolution?token=$EVOLUTION_WEBHOOK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
        "event": "messages.upsert",
        "instance": "manual-test",
        "data": {
          "key": { "remoteJid": "5500000000999@s.whatsapp.net", "fromMe": false, "id": "manual-test-message" },
          "message": { "conversation": "Mensagem manual de teste" }
        }
      }'
```

Resultado esperado na primeira chamada: `{"data":{"status":"processed","sessionId":"<id>","newSession":true}}`.
Repita o mesmo comando: `newSession` deve virar `false` e nenhuma sessão duplicada deve ser criada.

## 6. Consultar sessões no Postgres

```bash
docker compose exec postgres psql -U proconchat -d proconchat -c \
  "SELECT id, LEFT(phone_hash, 12) AS phone_hash_prefix, status, started_at FROM sessions ORDER BY started_at DESC;"
```

O telefone não é armazenado em texto puro — o valor exibido é parte de um HMAC criado pelo
Backend (`PHONE_HASH_SECRET`), nunca acessível pelo Gateway.

## 7. Criar e conectar uma instância na Evolution

Com os containers saudáveis, abra `http://localhost:8080/manager` (ou use os endpoints da Evolution
API com o header `apikey` configurado em `EVOLUTION_API_KEY`). Selecione `Instance +` e preencha:

- Name: `procon-test`;
- Channel: `Baileys`;
- Token: mantenha o valor gerado pelo Manager;
- Number: pode ficar vazio até existir um número destinado a testes.

Leia o QR Code somente com um número de WhatsApp destinado a testes.

## 8. Teste com WhatsApp

Depois de conectar o número, envie uma mensagem a partir de outro WhatsApp e acompanhe o fluxo:

```bash
docker compose logs -f evolution-api gateway backend
```

Consulte a tabela `sessions` (passo 6). Pressione `Ctrl+C` para parar de acompanhar os logs — isso
não encerra os containers. Nesse estágio, o resultado esperado é o recebimento do evento e a
criação da sessão, sem resposta automática no WhatsApp (`EVOLUTION_AUTO_REPLY_ENABLED=false`).

## 9. Parar e iniciar novamente

```bash
docker compose stop      # preserva os dados
docker compose start     # inicia novamente
docker compose down      # remove os containers, preservando os volumes
```

Não execute `docker compose down -v`: a opção `-v` remove os volumes do PostgreSQL, Redis e
Evolution API.

## 10. Diagnóstico

```bash
docker compose ps
docker compose logs --tail 100 evolution-api gateway backend postgres redis
curl http://localhost:3000/health
curl http://localhost:3001/health
```

## O que o teste manual (passos 5 e 6) comprova

Valida:

- Gateway e Backend rodando no Docker, comunicando-se via HTTP interno;
- autenticação do webhook (`EVOLUTION_WEBHOOK_TOKEN`) e do endpoint interno (`GATEWAY_INTERNAL_TOKEN`);
- interpretação do evento da Evolution (`messages.upsert`);
- proteção do telefone por HMAC (nunca em texto puro, nunca acessível pelo Gateway);
- conexão com PostgreSQL, criação de sessão e reutilização sem duplicidade.

Não valida (depende do passo 7/8, com um número de WhatsApp real):

- recebimento real pelo WhatsApp, QR Code e conexão Baileys;
- envio de resposta automática para um telefone;
- motor de decisão do chatbot (fora de escopo desta spec — ver #14 em diante).
