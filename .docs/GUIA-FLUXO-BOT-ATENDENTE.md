# Guia de evolução: bot, atendente e mensagens WhatsApp

## 1. Objetivo

O sistema deve permitir que o bot converse automaticamente até que:

- O usuário solicite atendimento humano;
- Um atendente assuma a conversa;
- Um operador encerre o atendimento;
- A sessão retorne ao modo automático.

Quando um atendente assumir, o bot não deve responder, mesmo que novas mensagens sejam recebidas.

---

## 2. O gateway não deve ser desligado

Não é recomendado desativar o gateway ou o webhook da Evolution API quando um atendente assumir.

O gateway possui outras responsabilidades:

- Receber mensagens;
- Registrar eventos;
- Detectar encerramento;
- Atualizar sessões;
- Permitir que o atendente envie mensagens;
- Registrar histórico;
- Processar a devolução da conversa ao bot.

A solução correta é manter o gateway ativo e alterar o modo da conversa.

### Modos recomendados

```text
BOT_ACTIVE
WAITING_HUMAN
HUMAN_ACTIVE
BOT_RESUMED
CLOSED
```

Exemplo:

```text
BOT_ACTIVE
   ↓ usuário solicita atendente
WAITING_HUMAN
   ↓ atendente assume
HUMAN_ACTIVE
   ↓ atendente encerra
BOT_RESUMED
```

---

## 3. Estado da sessão

A sessão deve possuir um modo de atendimento persistido no banco.

Exemplo:

```sql
CREATE TYPE conversation_mode AS ENUM (
  'BOT_ACTIVE',
  'WAITING_HUMAN',
  'HUMAN_ACTIVE',
  'BOT_RESUMED',
  'CLOSED'
);

ALTER TABLE sessions
ADD COLUMN conversation_mode conversation_mode
NOT NULL DEFAULT 'BOT_ACTIVE';

ALTER TABLE sessions
ADD COLUMN assigned_agent_id VARCHAR(100);

ALTER TABLE sessions
ADD COLUMN handoff_reason TEXT;

ALTER TABLE sessions
ADD COLUMN handed_off_at TIMESTAMPTZ;

ALTER TABLE sessions
ADD COLUMN resumed_at TIMESTAMPTZ;
```

A decisão de responder deve ser feita consultando esse estado:

```text
mensagem recebida
   ↓
carrega sessão
   ↓
modo = HUMAN_ACTIVE?
   ├── sim: registra e não responde
   └── não: processa o fluxo do bot
```

O modo não deve existir somente em memória.

---

## 4. Como o atendente assume a conversa

Existem três possibilidades.

### 4.1 Comando enviado pelo usuário

Exemplos:

```text
atendente
humano
falar com atendente
preciso de ajuda
```

O bot identifica a intenção e altera:

```text
BOT_ACTIVE → WAITING_HUMAN
```

Resposta:

```text
Certo. Vou encaminhar sua conversa para um atendente.
Aguarde um momento.
```

### 4.2 Comando enviado pelo atendente

O painel ou operador pode executar:

```http
POST /sessions/{sessionId}/takeover
```

Com:

```json
{
  "agentId": "atendente-123",
  "reason": "Solicitação do cliente"
}
```

O backend altera a sessão para:

```text
HUMAN_ACTIVE
```

### 4.3 Integração com painel de atendimento

O painel deve permitir:

- Visualizar conversas aguardando atendimento;
- Assumir uma conversa;
- Enviar mensagens;
- Transferir para outro atendente;
- Devolver ao bot;
- Encerrar a conversa.

O painel nunca deve alterar diretamente o banco. Ele deve chamar endpoints do backend.

---

## 5. Regra principal para bloquear o bot

Antes de chamar o motor de decisão ou o LLM:

```typescript
const session = await sessions.findOrCreateActive(phoneHash);

if (
  session.conversationMode === "WAITING_HUMAN" ||
  session.conversationMode === "HUMAN_ACTIVE"
) {
  await interactions.create({
    sessionId: session.id,
    direction: "INBOUND",
    content: text,
    handledBy: "HUMAN",
  });

  return {
    sessionId: session.id,
    newSession: false,
    reply: null,
    suppressed: true,
  };
}
```

A mensagem deve ser registrada, mas nenhuma resposta automática deve ser enviada.

O bloqueio deve ocorrer antes de:

- `motor.iniciarSessao()`;
- `motor.escolherCategoria()`;
- `motor.processarPergunta()`;
- chamada ao LLM;
- envio pela Evolution API.

---

## 6. Mensagens enviadas pelo atendente

Mensagens do atendente também podem gerar eventos no webhook.

O sistema deve diferenciar:

```text
fromMe = true
```

de uma mensagem recebida do usuário.

Entretanto, não se deve ignorar todo evento `fromMe` sem análise, porque mensagens enviadas pelo painel podem precisar ser registradas no histórico.

Regra recomendada:

```text
fromMe = true
   ↓
não processar como entrada do usuário
   ↓
registrar como saída do atendente, se possível
```

O bot nunca deve responder ao próprio texto enviado.

---

## 7. Retorno ao bot

O retorno pode ocorrer por comando do atendente:

```http
POST /sessions/{sessionId}/resume-bot
```

O backend deve:

1. Validar permissão do atendente;
2. Registrar o encerramento do atendimento;
3. Limpar `assigned_agent_id`;
4. Alterar o modo para `BOT_RESUMED`;
5. Definir o próximo estado do fluxo;
6. Enviar uma mensagem de retomada.

Exemplo:

```text
O atendimento automático foi reativado.
Escolha uma opção para continuar:
```

Em seguida:

```text
BOT_RESUMED → BOT_ACTIVE
```

Não é recomendado devolver automaticamente ao bot apenas porque o atendente ficou inativo. Isso pode causar respostas inesperadas ao usuário.

Se houver timeout, o sistema deve avisar antes:

```text
Este atendimento será encerrado por inatividade.
Digite "atendente" se precisar continuar.
```

---

## 8. Comandos do sistema

Os comandos devem ser normalizados antes da análise:

```typescript
function normalizeCommand(text?: string): string {
  return (text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}
```

Exemplo:

```typescript
const command = normalizeCommand(text);

switch (command) {
  case "atendente":
  case "humano":
  case "falar com atendente":
    return requestHumanSupport();

  case "menu":
  case "inicio":
  case "início":
    return restartMenu();

  case "voltar":
    return goBack();

  case "cancelar":
    return cancelCurrentFlow();

  case "sair":
  case "encerrar":
    return finishConversation();

  default:
    return processCurrentStep();
}
```

Os comandos devem ser processados antes das opções numéricas.

Assim, `menu` pode funcionar em qualquer etapa, enquanto `1`, `2` e `3` são interpretados somente no contexto do estado atual.

---

## 9. Opções numéricas

O menu atual pode continuar usando números:

```text
1 - Cobrança
2 - Cancelamento
3 - Outros assuntos
```

A opção só deve ser interpretada depois da leitura do estado:

```text
AWAITING_CATEGORY + "1"
    → seleciona categoria 1

AWAITING_QUESTION + "1"
    → seleciona pergunta 1
```

A mesma opção pode possuir significados diferentes em etapas diferentes. Isso é correto, desde que o estado esteja persistido.

Nunca use a última opção recebida sem consultar novamente:

- `current_step`;
- `current_category_id`;
- sessão ativa;
- tenant ou cliente, quando aplicável.

---

## 10. Botões, listas e menus interativos

A Evolution API pode permitir recursos interativos dependendo da versão e do provedor WhatsApp:

- Botões;
- Listas;
- Menus;
- Respostas rápidas;
- Mensagens com identificador de seleção.

Exemplo conceitual:

```json
{
  "number": "5511999999999",
  "title": "Escolha uma categoria",
  "sections": [
    {
      "title": "Atendimento",
      "rows": [
        {
          "id": "category_cobranca",
          "title": "Cobrança"
        },
        {
          "id": "category_cancelamento",
          "title": "Cancelamento"
        }
      ]
    }
  ]
}
```

O backend deve preferir o identificador estável:

```text
category_cobranca
```

em vez da posição visual:

```text
1
```

Quando o usuário enviar uma seleção, o gateway deve extrair:

- `buttonId`;
- `listId`;
- `selectedRowId`;
- texto exibido;
- mensagem original.

A aplicação pode aceitar ambos:

```text
1
category_cobranca
```

Isso permite compatibilidade com clientes que usam WhatsApp Web, APIs diferentes ou texto manual.

---

## 11. Estrutura recomendada para mensagens

O gateway deve transformar os formatos da Evolution API em um modelo interno único:

```typescript
interface IncomingMessage {
  externalId: string;
  phone: string;
  instance: string;
  type: "text" | "image" | "audio" | "document" | "button" | "list";
  text?: string;
  command?: string;
  selectionId?: string;
  media?: {
    url?: string;
    mimeType?: string;
    fileName?: string;
    caption?: string;
  };
  fromMe: boolean;
  receivedAt: Date;
}
```

O backend não deve depender diretamente do payload específico da Evolution API.

---

## 12. Recebimento de imagens

O webhook pode receber imagens com:

- URL;
- Base64;
- MIME type;
- Legenda;
- ID da mídia;
- Nome do arquivo.

O gateway deve:

1. Validar o evento;
2. Registrar o `externalId`;
3. Identificar o telefone;
4. Extrair a legenda;
5. Identificar a mídia;
6. Baixar ou encaminhar a imagem com segurança;
7. Enviar para o backend, se necessário.

Exemplo:

```typescript
if (message.type === "image") {
  return processImageMessage({
    phone: message.phone,
    mediaUrl: message.media?.url,
    caption: message.media?.caption,
  });
}
```

Não se deve confiar diretamente em uma URL recebida sem validação.

Validar:

- Tipo MIME;
- Tamanho máximo;
- Extensão;
- Origem;
- Expiração da URL;
- Permissão de acesso.

---

## 13. Imagens durante o atendimento humano

Quando o modo for `HUMAN_ACTIVE`:

```text
imagem recebida
   ↓
registra no histórico
   ↓
disponibiliza ao atendente
   ↓
não chama o bot
```

A imagem pode ser usada para:

- Documento;
- Comprovante;
- Foto de produto;
- Captura de tela;
- Evidência de atendimento.

O sistema deve armazenar metadados e, preferencialmente, guardar o arquivo em storage externo:

- S3;
- Azure Blob;
- MinIO;
- outro storage compatível.

Evite armazenar arquivos grandes diretamente no PostgreSQL.

---

## 14. Imagens durante o atendimento automático

Se a imagem for recebida em `BOT_ACTIVE`, existem opções:

### Opção A: encaminhar para atendente

Recomendado para documentos ou casos não automatizados:

```text
Recebi sua imagem e vou encaminhá-la para um atendente.
```

### Opção B: processar com OCR

O sistema pode extrair texto utilizando OCR e enviar o resultado ao fluxo.

### Opção C: análise por visão computacional

O LLM ou serviço de visão pode classificar a imagem, desde que:

- O cliente autorize;
- Haja controle de privacidade;
- O arquivo não contenha dados indevidos;
- O resultado seja validado.

Por padrão, uma imagem não deve ser interpretada como texto vazio.

---

## 15. Áudio, documentos e localização

A mesma estrutura pode ser estendida:

```text
text
image
audio
document
location
contact
button
list
```

Comportamento recomendado:

```text
áudio sem transcrição
   → encaminhar ao atendente

documento
   → validar tamanho e tipo
   → registrar
   → encaminhar

localização
   → extrair latitude e longitude
   → validar finalidade
   → registrar

contato
   → solicitar confirmação do usuário
```

Cada tipo deve possuir um handler próprio, sem aumentar excessivamente o controller do webhook.

---

## 16. Separação entre entrada, fluxo e envio

Arquitetura recomendada:

```text
EvolutionWebhookController
   ↓
IncomingMessageParser
   ↓
MessageDeduplicationService
   ↓
ConversationRouter
   ├── BotConversationService
   ├── HumanHandoffService
   ├── MediaMessageService
   └── CommandService
   ↓
OutboundMessageService
   ↓
EvolutionGateway
```

Responsabilidades:

- **Parser**: normaliza payloads;
- **Deduplicação**: impede reprocessamento;
- **Router**: escolhe o destino;
- **Bot service**: processa estados;
- **Handoff service**: controla atendentes;
- **Media service**: trata imagens e arquivos;
- **Outbound service**: envia mensagens com idempotência;
- **Gateway**: comunica com a Evolution API.

---

## 17. Idempotência de mensagens enviadas

Para evitar respostas duplicadas, criar uma chave única:

```text
externalMessageId + sessionStep + responseType
```

Exemplo:

```text
message-123:AWAITING_QUESTION:question-menu
```

Antes de enviar:

```text
chave já enviada?
   ├── sim: não enviar novamente
   └── não: registrar e enviar
```

Essa proteção é necessária porque:

- Webhooks podem ser repetidos;
- Containers podem reiniciar;
- Workers podem processar novamente;
- A Evolution API pode repetir uma operação.

---

## 18. Concorrência e fila

Mensagens do mesmo telefone devem ser processadas em ordem.

Opções:

- Lock no PostgreSQL;
- Fila por telefone;
- Redis Streams;
- BullMQ;
- RabbitMQ;
- processamento serial no worker.

O lock em memória é suficiente apenas para uma instância.

Em produção com múltiplas instâncias, utilizar Redis ou PostgreSQL.

---

## 19. Segurança e permissões

Os endpoints de atendente devem exigir:

- Autenticação;
- Autorização;
- Identificação do operador;
- Registro de auditoria;
- Controle de tenant;
- Proteção contra acesso cruzado.

Ações que devem gerar auditoria:

```text
atendente assumiu conversa
atendente enviou mensagem
conversa transferida
bot foi reativado
conversa encerrada
arquivo acessado
```

Nunca exponha uma URL pública permanente para arquivos enviados pelos usuários.

---

## 20. Estados recomendados

Uma evolução possível da sessão:

```text
BOT_ACTIVE
WAITING_HUMAN
HUMAN_ACTIVE
WAITING_CUSTOMER
BOT_RESUMED
CLOSED
ABANDONED
```

Exemplo completo:

```text
BOT_ACTIVE
  ↓ usuário pede atendente
WAITING_HUMAN
  ↓ operador assume
HUMAN_ACTIVE
  ↓ operador aguarda usuário
WAITING_CUSTOMER
  ↓ usuário responde
HUMAN_ACTIVE
  ↓ operador devolve ao bot
BOT_RESUMED
  ↓
BOT_ACTIVE
```

As transições devem ser validadas pelo backend.

---

## 21. Checklist de implementação

### Controle bot/atendente

- [ ] Criar `conversation_mode`;
- [ ] Persistir o modo no banco;
- [ ] Bloquear o bot em `WAITING_HUMAN`;
- [ ] Bloquear o bot em `HUMAN_ACTIVE`;
- [ ] Criar endpoint para assumir;
- [ ] Criar endpoint para devolver ao bot;
- [ ] Registrar o atendente responsável;
- [ ] Registrar auditoria.

### Mensagens

- [ ] Normalizar texto;
- [ ] Processar comandos antes dos menus;
- [ ] Suportar opções numéricas;
- [ ] Suportar IDs de botões;
- [ ] Suportar IDs de listas;
- [ ] Criar idempotência de saída;
- [ ] Persistir o histórico.

### Mídia

- [ ] Identificar imagens;
- [ ] Validar MIME type;
- [ ] Validar tamanho;
- [ ] Armazenar mídia com segurança;
- [ ] Encaminhar ao atendente;
- [ ] Definir política de retenção;
- [ ] Registrar legenda.

### Operação

- [ ] Usar fila ou lock distribuído;
- [ ] Monitorar mensagens suprimidas;
- [ ] Monitorar conversas aguardando atendente;
- [ ] Criar alertas para falhas;
- [ ] Testar reinício dos containers;
- [ ] Testar webhooks duplicados.

---

## 22. Caminho recomendado

A implementação deve seguir esta ordem:

1. Criar o campo persistido `conversation_mode`;
2. Implementar `BOT_ACTIVE` e `HUMAN_ACTIVE`;
3. Bloquear o processamento automático no modo humano;
4. Criar endpoints para assumir e devolver conversas;
5. Implementar histórico de mensagens;
6. Normalizar texto, botões e listas;
7. Adicionar comandos globais;
8. Adicionar recebimento de imagens;
9. Adicionar fila ou lock distribuído;
10. Criar painel de atendimento;
11. Adicionar auditoria e métricas;
12. Testar todos os estados e transições.

A regra fundamental é:

> O gateway permanece ativo. Quem decide se o bot pode responder é o estado persistido da conversa no backend.