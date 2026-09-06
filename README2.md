# Teste da Evolution API

Este guia descreve como subir e testar a integração entre Evolution API, backend, PostgreSQL e
Redis. É possível executar a maior parte dos testes sem possuir um número de WhatsApp.

## 1. Pré-requisitos

- Docker Desktop iniciado;
- WSL 2 habilitado no Windows;
- Git;
- Node.js 20.

## 2. Configurar o ambiente

Na raiz do projeto, crie o arquivo local de configuração:

```powershell
Copy-Item .env.example .env
```

Abra o `.env` e configure todas as variáveis abaixo:

```env
POSTGRES_USER=proconchat
POSTGRES_PASSWORD=uma-senha-local-forte
POSTGRES_PORT=5433

REDIS_PASSWORD=outra-senha-local-forte
REDIS_PORT=6379

EVOLUTION_API_KEY=uma-chave-local-forte
EVOLUTION_API_PORT=8080
EVOLUTION_WEBHOOK_TOKEN=outro-token-local-forte

BACKEND_PORT=3000
PHONE_HASH_SECRET=outro-segredo-local-forte
EVOLUTION_AUTO_REPLY_ENABLED=false
```
As credenciais do PostgreSQL são aplicadas na criação inicial do volume. Não altere apenas a senha do `.env` depois que o banco já tiver dados, pois o usuário existente continuará com a senha anterior.

## 3. Subir os serviços

Na raiz do projeto:

```powershell
docker compose up --build -d
docker compose ps
```

Devem aparecer quatro serviços:

- `backend`;
- `evolution-api`;
- `postgres`;
- `redis`.

Backend, PostgreSQL e Redis devem aparecer como `healthy`. A Evolution API deve aparecer como `Up`.

## 4. Endereços locais

- Backend: http://localhost:3000
- Health check: http://localhost:3000/health
- Evolution API: http://localhost:8080
- Evolution Manager: http://localhost:8080/manager
- PostgreSQL: `localhost:5433`
- Redis: `localhost:6379`

## 5. Se modificar o back

Depois de modificar o backend, reconstrua somente esse serviço:

```powershell
docker compose up --build -d backend
```

## 6. Testes unitários

Os testes unitários não acessam o PostgreSQL real nem enviam mensagens reais:

```powershell
cd src/backend
npm ci
npm test
npm run build
cd ../..
```

Resultado esperado:

```text
Test Files  10 passed
Tests       27 passed
```

## 7. Teste de integração sem número de WhatsApp

Este teste usa o PostgreSQL do Docker, simula duas entregas do mesmo webhook e confirma que apenas uma sessão foi criada. Os dados criados são removidos automaticamente ao final.

Na raiz do projeto:

```powershell
docker compose --profile test run --rm --build backend-tests
```

Resultado esperado:

```text
Test Files  1 passed
Tests       1 passed
```

Como o teste realiza a limpeza, a tabela `sessions` continuará vazia depois da execução.

## 8. Teste manual do webhook sem WhatsApp

Este teste deixa uma sessão fictícia no banco para que ela possa ser consultada no pgAdmin.

Na raiz do projeto, execute:

```powershell
$webhookToken = (Get-Content .env | Where-Object { $_ -like 'EVOLUTION_WEBHOOK_TOKEN=*' }).Split('=', 2)[1]

$payload = @{
    event = 'messages.upsert'
    instance = 'manual-test'
    data = @{
        key = @{
            remoteJid = '5500000000999@s.whatsapp.net'
            fromMe = $false
            id = 'manual-test-message'
        }
        message = @{
            conversation = 'Mensagem manual de teste'
        }
    }
} | ConvertTo-Json -Depth 6

$response = Invoke-RestMethod `
    -Uri "http://localhost:3000/api/v1/webhooks/evolution?token=$webhookToken" `
    -Method Post `
    -ContentType 'application/json' `
    -Body $payload

$response.data
```

Resultado esperado:

```text
status    : processed
sessionId : número da sessão
newSession: True
```

Execute novamente o mesmo comando. Na segunda execução, `newSession` deve ser `False` e nenhuma
sessão duplicada deve ser criada.

## 9. Consultar pelo pgAdmin

Registre um servidor separado para o PostgreSQL do Docker:

- Name: `ProconChat Docker`;
- Host: `localhost`;
- Port: `5433`;
- Maintenance database: `proconchat`;
- Username: valor de `POSTGRES_USER` no `.env`;
- Password: valor de `POSTGRES_PASSWORD` no `.env`.

No banco `proconchat`, execute:

```sql
SELECT
    id,
    LEFT(phone_hash, 12) AS phone_hash_prefix,
    status,
    started_at,
    ended_at
FROM sessions
ORDER BY started_at DESC;
```

O telefone não é armazenado em texto puro. O valor exibido é parte de um HMAC criado pelo backend.

Para remover somente a sessão criada no teste manual, substitua o número pelo `sessionId` retornado:

```sql
DELETE FROM sessions WHERE id = 1;
```

## 10. Criar uma instância na Evolution

Abra http://localhost:8080/manager e informe, caso solicitado:

- Server URL: `http://localhost:8080`;
- API Key: valor de `EVOLUTION_API_KEY` no `.env`.

Selecione `Instance +` e preencha:

- Name: `procon-test`;
- Channel: `Baileys`;
- Token: mantenha o valor gerado pelo Manager;
- Number: pode ficar vazio até existir um número destinado ao teste.

## 11. Teste com WhatsApp

Depois que a instância estiver conectada:

1. Envie uma mensagem para o número conectado usando outro WhatsApp.
2. Acompanhe os logs:

```powershell
docker compose logs -f evolution-api backend
```

3. Consulte a tabela `sessions` no pgAdmin.

Pressione `Ctrl+C` para deixar de acompanhar os logs. Isso não encerra os containers.

A resposta automática está desativada enquanto o motor de decisão não estiver integrado:

```env
EVOLUTION_AUTO_REPLY_ENABLED=false
```

Nesse estágio, o resultado esperado é o recebimento do evento e a criação da sessão, sem resposta automática no WhatsApp.

## 12. Parar e iniciar novamente

Parar preservando os dados:

```powershell
docker compose stop
```

Iniciar novamente:

```powershell
docker compose start
```

Remover os containers preservando os volumes:

```powershell
docker compose down
```

Não execute `docker compose down -v` se houver dados que precisam ser preservados. A opção `-v` remove os volumes do PostgreSQL, Redis e Evolution API.

## 13. Diagnóstico

Status dos serviços:

```powershell
docker compose ps
```

Logs recentes:

```powershell
docker compose logs --tail 100 backend evolution-api postgres redis
```

Executar novamente todos os testes de integração:

```powershell
docker compose --profile test run --rm --build backend-tests
```
##  O que esse teste comprova
Ele valida:
- Backend rodando no Docker.
- Autenticação do webhook.
- Interpretação do evento da Evolution.
- Proteção do telefone por HMAC.
- Conexão com PostgreSQL.
- Criação de sessão.
- Reutilização da sessão sem duplicidade.
NÃO VALIDA:
- Recebimento real pelo WhatsApp.
- QR Code e conexão Baileys.
- Envio de resposta para um telefone.
- Motor de decisão do chatbot.