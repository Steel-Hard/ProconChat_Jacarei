# Gateway WhatsApp (Evolution API)

A Evolution API e o backend nao devem ser executados por arquivos Compose separados. O arquivo
[`compose.yaml`](../../compose.yaml) na raiz e a fonte unica de configuracao e sobe:

- Evolution API na porta `8080`;
- backend ProconChat na porta `3000`;
- PostgreSQL na porta `5433` do host;
- Redis na porta `6379`.

O PostgreSQL e compartilhado no mesmo servidor, mas os dados ficam separados: o backend usa o
schema `public` e a Evolution usa o schema `evolution`. A Evolution encaminha eventos
`messages.upsert` internamente para `POST /api/v1/webhooks/evolution` no backend.

## Primeira execucao

Na raiz do repositorio:

```bash
cp .env.example .env
docker compose up --build -d
docker compose ps
```

No PowerShell, use `Copy-Item .env.example .env` no lugar de `cp` se preferir.

Troque as chaves e senhas do `.env` antes de qualquer ambiente compartilhado. A resposta
automatica fica desligada por padrao (`EVOLUTION_AUTO_REPLY_ENABLED=false`) ate o motor de decisao
ser conectado ao webhook.

## Criar e conectar uma instancia

Com os containers saudaveis, abra `http://localhost:8080/manager` ou use os endpoints da Evolution
API com o header `apikey` configurado em `EVOLUTION_API_KEY`. Crie uma instancia e leia o QR Code
somente com um numero de WhatsApp destinado a testes.

Depois de conectar o numero, envie uma mensagem a partir de outro WhatsApp e acompanhe o fluxo com:

```bash
docker compose logs -f evolution-api backend
docker compose --profile test run --rm --build backend-tests
```

O token `EVOLUTION_WEBHOOK_TOKEN` e incluido automaticamente na URL interna e validado pelo
backend; ele deve ser diferente da chave principal da API.

## Diagnostico

```bash
docker compose logs -f evolution-api backend
docker compose exec postgres psql -U proconchat -d proconchat -c "select * from sessions;"
curl http://localhost:3000/health
```

Os scripts em `src/backend/db/schema` so sao aplicados automaticamente quando o volume do banco e
criado pela primeira vez. Nao use `docker compose down -v` se houver dados que precisam ser
preservados.
