# Diagnóstico Evolution API, Gateway e Fluxo de Atendimento (ProconChat)

Este documento reúne o diagnóstico técnico completo da integração entre a Evolution API (WhatsApp), o Gateway, o Backend do ProconChat e a IA (Ollama / LLM), cobrindo a resolução de problemas de pareamento, disparo de mensagens e navegação do bot.

---

## 1. Por que a Evolution API não gerava o QR Code?

A falha na geração do QR Code foi causada por uma **combinação de protocolo defasado e gargalo de configuração no Docker**:

### 1.1. A falta de `CONFIG_SESSION_PHONE_VERSION` e o Baileys
- A Evolution API utiliza internamente a biblioteca **Baileys** para estabelecer a conexão WebSocket com os servidores da Meta (WhatsApp).
- O WhatsApp atualiza com frequência as assinaturas do protocolo WhatsApp Web e revoga o suporte a versões antigas.
- Sem a variável `CONFIG_SESSION_PHONE_VERSION`, a Evolution API tenta usar a versão empacotada no container. Em imagens mais antigas, essa versão já foi revogada pela Meta. Com isso, os servidores do WhatsApp recusam silenciosamente o handshake ou retornam `{"count": 0}`, deixando o painel do Manager carregando indefinidamente sem renderizar o QR Code.
- **Solução aplicada**: Inclusão de `CONFIG_SESSION_PHONE_VERSION=2.3000.1033893291` no arquivo `.env` e no `compose.yaml`.

### 1.2. Imagem desatualizada da Evolution API
- O arquivo `compose.yaml` utilizava a versão `evoapicloud/evolution-api:v2.1.1`.
- Essa versão continha um Baileys desatualizado, incapaz de concluir o fluxo moderno de registro de companheiro (`companion registration`) exigido pelo WhatsApp.
- **Solução aplicada**: Atualização da imagem para `evoapicloud/evolution-api:v2.3.7`.

### 1.3. Sobrecarga de I/O por histórico no Docker (`Pre-key upload timeout`)
- Variáveis como `DATABASE_SAVE_DATA_CHATS`, `DATABASE_SAVE_DATA_CONTACTS` e `DATABASE_SAVE_DATA_HISTORIC` estavam ativadas como `true`.
- No momento em que uma nova sessão tenta parear, o WhatsApp inicia uma sincronização massiva de histórico. A gravação simultânea no PostgreSQL e Redis sob a ponte de rede do Docker sobrecarregava o event-loop da aplicação, estourando o tempo limite de pré-chaves (`Pre-key upload timeout` / código 515) e derrubando a sessão antes do QR Code ser lido.
- **Solução aplicada**: Como o ProconChat é um chatbot voltado a mensagens em tempo real (`messages.upsert`), o salvamento de histórico antigo foi desligado, mantendo apenas `DATABASE_SAVE_DATA_INSTANCE`, `NEW_MESSAGE` e `MESSAGE_UPDATE`.

### 1.4. Resolução DNS e IPv6 no Docker
- Containers Node.js no Docker Desktop podem tentar resolver domínios `*.whatsapp.net` por IPv6 prioritariamente, sofrendo timeouts.
- **Solução aplicada**: Injeção da variável `NODE_OPTIONS: "--dns-result-order=ipv4first"`.

---

## 2. Por que o Bot não respondeu inicialmente?

Após o WhatsApp ser conectado com sucesso, a ausência de resposta inicial decorreu de:

1. **`EVOLUTION_AUTO_REPLY_ENABLED=false` no `.env`**:
   - No Gateway (`src/gateway/services/evolutionWebhook.service.ts`), a linha que despacha o `sendText` para a Evolution API possui uma trava condicional:
     ```typescript
     if (session.reply?.text && process.env.EVOLUTION_AUTO_REPLY_ENABLED === "true") {
         await messages.sendText({ ... })
     }
     ```
   - Estando desligada (`false`), o Gateway recebia o webhook, gerava a resposta internamente junto ao Backend, mas não enviava nada ao WhatsApp.
   - **Correção**: Definir `EVOLUTION_AUTO_REPLY_ENABLED=true` e recriar o container do gateway (`docker compose up -d gateway`).

2. **Webhook da Instância na Evolution**:
   - É necessário garantir que o webhook esteja ativo apontando para `http://gateway:3001/webhooks/evolution?token=<TOKEN>` com o evento `MESSAGES_UPSERT` selecionado.

---

## 3. Arquitetura do Bot e da IA (Ollama / LLM)

### 3.1. O Bot é determinístico (Motor de Decisão)
O ProconChat **não** é um chat livre aberto com IA desde a primeira mensagem. Para assegurar confiabilidade jurídica e conformidade com o Código de Defesa do Consumidor (CDC), o fluxo é guiado por uma máquina de estados:

```
[Qualquer mensagem inicial] ──> Responde com menu de CATEGORIAS (ex: 1. Telefonia, 2. Bancos)
                 │
  [Cidadão digita o número] ──> Responde com PERGUNTAS daquela categoria
                 │
[Cidadão escolhe a pergunta] ──> Responde com a ORIENTAÇÃO OFICIAL + BASE LEGAL + DOCUMENTOS
```

### 3.2. O papel da IA (Ollama `llama3.2:3b`)
- A IA fica alocada no serviço `src/backend/services/llmExplicacao.service.ts` através do cliente `src/backend/clients/ollamaLlm.client.ts`.
- Sua atribuição é receber a **resposta estruturada oficial** e reescrevê-la em linguagem natural, empática e acessível ao cidadão, preservando rigorosamente as bases legais sem inventar procedimentos.

---

## 4. Diagnóstico dos novos problemas relatados

### 4.1. "Não entendi. Digite o número de uma das opções abaixo:" (sem opções)
- **Causa**: As migrations do banco criam as tabelas vazias. O conteúdo oficial do PROCON (as 7 categorias e as 47 perguntas) reside no script de sementes (`src/backend/db/seeds/run.ts`). Sem a execução desse seed, a tabela `Categories` fica com 0 registros.
- Quando o usuário envia qualquer texto, o sistema não encontra nenhuma opção válida para comparar (`parseOption(text, 0) === null`), caindo na mensagem de erro. Como a lista de categorias está vazia, o formatador exibia apenas o cabeçalho de erro sem nenhuma opção abaixo.
- **Soluções**:
  1. Executar o seed no banco de dados para carregar as 7 categorias e 47 perguntas.
  2. Ajustar o `messageFormatter.service.ts` para tratar graciosamente casos de catálogo em atualização.
  3. Configurar o container `migrate` para rodar automaticamente as migrations e o seed na inicialização.

### 4.2. O bot envia 2 mensagens iguais de cada vez
- **Causa 1 (Webhook Duplo)**: Quando tanto o Webhook Global (definido nas variáveis de ambiente da Evolution no `compose.yaml`) quanto o Webhook local da Instância (configurado na interface do Evolution Manager) estão apontando para o Gateway, a Evolution API dispara **duas requisições HTTP POST para cada mensagem recebida**.
- **Causa 2 (Falta de Idempotência no Gateway)**: O Gateway não possuía filtro de mensagens duplicadas. Ao receber 2 requisições com o mesmo `payload.data.key.id`, processava ambas e ordenava 2 envios de resposta para o WhatsApp.
- **Soluções**:
  1. **Deduplicação de mensagens no Gateway**: Implementar um mecanismo em memória com TTL no Gateway que ignora requisições repetidas com o mesmo `messageId`.
  2. **Ajuste na Evolution**: Usar preferencialmente apenas um dos canais de webhook (ou o global ou o da instância).

---

## 5. Como Testar e Validar

### 5.1. Popular o banco com as 7 categorias e 47 perguntas
Execute o comando abaixo com o container do backend em execução:
```bash
docker compose exec backend node dist/db/seeds/run.js
```
Saída esperada:
```
Seed concluído: 7 categorias / 47 perguntas do FAQ do PROCON carregadas.
```

### 5.2. Testar o fluxo via cURL (sem celular)
```bash
curl -X POST "http://localhost:3001/webhooks/evolution?token=j8839rj23awdmoiawdm9u214" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "messages.upsert",
    "instance": "procon-test",
    "data": {
      "key": { "remoteJid": "5512999999999@s.whatsapp.net", "fromMe": false, "id": "msg-teste-1" },
      "message": { "conversation": "Olá" }
    }
  }'
```

### 5.3. Acompanhar os logs dos serviços
```bash
docker compose logs -f gateway backend evolution-api
```
