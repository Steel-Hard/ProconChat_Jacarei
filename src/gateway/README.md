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
- `gateway` (porta `3001`);
- `ollama` (sem porta pública mapeada, só acessível pela rede interna do compose) e `llm-pull`
  (baixa o modelo `LLM_MODEL` — padrão `llama3.2:3b` — e sai).

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

Devem aparecer sete serviços: `postgres`, `redis`, `evolution-api`, `backend`, `gateway`, `ollama`
(mais o `migrate` e o `llm-pull`, que rodam uma vez e saem com código `0`). `postgres`, `redis`,
`backend`, `gateway` e `ollama` aparecem como `healthy`; `evolution-api` aparece como `Up`.

Troque as chaves e senhas do `.env` antes de qualquer ambiente compartilhado. As credenciais do
PostgreSQL são aplicadas na criação inicial do volume — não altere só a senha depois que o banco já
tiver dados. A resposta automática fica desligada por padrão (`EVOLUTION_AUTO_REPLY_ENABLED=false`)
até o motor de decisão ser conectado ao webhook.

### Variáveis da WhatsApp Cloud API

O webhook `/webhooks/whatsapp` usa as variáveis abaixo, lidas do `.env` da raiz. Sem elas no
`.env`, o `compose.yaml` aplica defaults de desenvolvimento e o gateway sobe sem app da Meta (os
envios falham até as credenciais reais serem configuradas).

| Variável | Obrigatória | Descrição |
|---|---|---|
| `WHATSAPP_PHONE_NUMBER_ID` | sim | ID do número no app da Meta (**WhatsApp → Configuração da API**). Eventos de outro número são ignorados |
| `WHATSAPP_ACCESS_TOKEN` | sim | Token usado no envio pela Graph API. Use um **token de usuário do sistema sem expiração** (seção "Token de acesso permanente"); o token temporário do painel expira em 24 h |
| `WHATSAPP_APP_SECRET` | sim | Chave secreta do app (**Configurações do app → Básico**), usada para validar `X-Hub-Signature-256` |
| `WHATSAPP_VERIFY_TOKEN` | sim | Segredo escolhido pelo time e repetido no campo "Verificar token" do webhook na Meta |
| `WHATSAPP_GRAPH_API_VERSION` | não | Versão da Graph API usada no envio. Padrão: `v26.0` |

Nenhuma dessas variáveis aparece em log. Os segredos ficam só no `.env`, nunca em arquivo versionado.

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

## 11. WhatsApp Cloud API (`/webhooks/whatsapp`)

O gateway também recebe eventos da WhatsApp Cloud API oficial (issue #53, decisão 003). A Evolution
continua funcionando em paralelo até a issue #82. O caminho é:

Meta → `GET`/`POST /webhooks/whatsapp` neste Gateway → `POST /api/v1/whatsapp/sessions` no Backend →
resposta enviada pela Graph API (`https://graph.facebook.com/<versão>/<WHATSAPP_PHONE_NUMBER_ID>/messages`).

- `GET /webhooks/whatsapp`: verificação da Meta. Com `hub.mode=subscribe` e `hub.verify_token` igual a
  `WHATSAPP_VERIFY_TOKEN`, responde `200` em `text/plain` com o `hub.challenge`. Qualquer outro caso
  responde `403 FORBIDDEN`.
- `POST /webhooks/whatsapp`: eventos. O cabeçalho `X-Hub-Signature-256` precisa ser
  `sha256=` + HMAC-SHA256 do corpo cru com `WHATSAPP_APP_SECRET`. Sem assinatura ou com assinatura
  errada: `401 UNAUTHORIZED`, nada é processado. Corpo assinado que não é JSON: `400 BAD_REQUEST`.
- Mensagens de texto vão ao Backend como `{ phone, text }`; toques em lista ou botão vão como
  `{ phone, optionId }`. Eventos de status, outros números, outros campos, mensagens repetidas (mesmo
  `wamid`), mensagens com mais de 5 minutos e tipos sem texto (áudio, imagem etc.) são ignorados com um
  log JSON que tem só `reason` e `messageId`, nunca telefone, texto ou token.
- As mensagens do mesmo telefone são processadas em fila: a resposta inteira de uma mensagem é enviada
  antes de a próxima ser repassada ao Backend.
- O Backend pode devolver `reply.messages` com itens `text`, `list` (até 10 linhas, título ≤ 24,
  descrição ≤ 72, `buttonText` ≤ 20, corpo ≤ 4096) ou `buttons` (até 3, título ≤ 20, corpo ≤ 1024).
  Sem `reply.messages`, o Gateway envia `reply.text` como texto (corpo ≤ 4096). Mensagem fora dos limites
  não é enviada, dividida nem truncada: fica no log como `invalid_outgoing_message`.

### Túnel HTTPS para o teste

A Meta só chama URL HTTPS pública. Até existir a URL do time (issue #51), cada dev usa um túnel
apontando para a porta do gateway, por exemplo:

```bash
ngrok http 3001
cloudflared tunnel --url http://localhost:3001
```

No app da Meta, em **WhatsApp → Configuração → Webhook**, informe `https://<túnel>/webhooks/whatsapp`
como URL de callback e o valor de `WHATSAPP_VERIFY_TOKEN` em "Verificar token". Depois de "Verificar e
salvar", assine o campo `messages`. O número de teste da Meta só entrega a até 5 destinatários
cadastrados no app.

### Teste manual com `curl`

Verificação (deve imprimir `123`):

```bash
curl -s "http://localhost:3001/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=$WHATSAPP_VERIFY_TOKEN&hub.challenge=123"
```

Evento assinado (use o mesmo `WHATSAPP_APP_SECRET` e `WHATSAPP_PHONE_NUMBER_ID` do gateway; com os
defaults do Compose são `development-app-secret` e `development-phone-number-id`):

```bash
BODY='{"object":"whatsapp_business_account","entry":[{"id":"0","changes":[{"field":"messages","value":{"messaging_product":"whatsapp","metadata":{"phone_number_id":"development-phone-number-id"},"messages":[{"id":"wamid.manual-1","from":"5500000000999","type":"text","text":{"body":"oi"}}]}}]}]}'
SIGNATURE="sha256=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$WHATSAPP_APP_SECRET" | sed 's/^.* //')"
curl -s -X POST http://localhost:3001/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: $SIGNATURE" \
  -d "$BODY"
```

Resultado esperado: `{"data":{"results":[{"status":"processed","messageId":"wamid.manual-1"}]}}` e uma
sessão criada no Backend. O envio da resposta falha sem credenciais reais (`send_failed` no log), o que
não muda o `200`. Repetir o comando devolve `duplicate_message`. Sem o cabeçalho `X-Hub-Signature-256`,
a resposta é `401`.

### Validação com número real e diagnóstico de entrega

O número de teste da Meta recebe mensagens e aceita os envios, mas enquanto o portfólio do negócio não
tiver a verificação de empresa (erro `141010`), toda entrega para número brasileiro termina com status
`failed` e código `130497` ("Business account is restricted from messaging users in this country").
Por isso, a validação manual usa um número real registrado na conta do WhatsApp Business (status
`CONNECTED`), com o `WHATSAPP_PHONE_NUMBER_ID` dele no `.env`.

O gateway ainda descarta os eventos de status (`status_update` no log, sem o código de erro); o registro
de `sent`/`delivered`/`read`/`failed` vem na issue #88. Até lá, quando a resposta não chega ao celular:

1. Conferir a saúde do número (o token vem do `.env`, sem imprimir o valor):

   ```bash
   curl -s -G "https://graph.facebook.com/$WHATSAPP_GRAPH_API_VERSION/$WHATSAPP_PHONE_NUMBER_ID" \
     --data-urlencode "fields=health_status" \
     -H "Authorization: Bearer $WHATSAPP_ACCESS_TOKEN"
   ```

   A resposta traz `can_send_message` (`AVAILABLE`, `LIMITED` ou `BLOCKED`) no geral e para cada entidade
   (número, conta do WhatsApp Business, negócio, app), com `errors[].error_code` explicando a limitação
   (ex.: `141010`, empresa não verificada). `LIMITED` ou `BLOCKED` não impede necessariamente a resposta
   dentro da janela de 24 h: compare com o status real da mensagem (passo 2).
2. Ver o payload de status no painel do app: em **WhatsApp → Configuração → Webhook**, abrir
   "Verifique webhooks de teste" (ou o log de eventos do webhook) e ler o evento `statuses` da mensagem
   enviada. Um `status: "failed"` traz `errors[].code` e `errors[].title` (ex.: `130497`).
3. No gateway, `send_failed` no log indica recusa da Graph API no envio (o `detail` mostra só o status
   HTTP). Envio aceito que não chega ao celular aparece só no status, como nos passos acima.

### Token de acesso permanente

O token temporário do painel de desenvolvedor expira em 24 h. Para testar e operar, use um token de
usuário do sistema sem expiração:

1. No Meta Business Suite, abrir **Configurações do negócio → Usuários → Usuários do sistema** e clicar
   em **Adicionar**.
2. Dar um nome (ex.: `proconchat-gateway`) e escolher o papel **Administrador**.
3. Com o usuário selecionado, clicar em **Atribuir ativos**: em **Apps**, escolher o app de teste e dar
   controle total; em **Contas do WhatsApp**, escolher a conta do WhatsApp Business do app e dar
   controle total. Salvar.
4. Clicar em **Gerar novo token**, escolher o app, definir a validade como **Nunca** e marcar as
   permissões `whatsapp_business_messaging` e `whatsapp_business_management`.
5. Gerar e copiar o token (ele só aparece uma vez).
6. Colar em `WHATSAPP_ACCESS_TOKEN` no `.env` da raiz (nunca em arquivo versionado) e recriar o
   gateway: `docker compose up -d --build gateway`.
7. Conferir enviando uma mensagem ao número de teste a partir de um destinatário cadastrado.

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
