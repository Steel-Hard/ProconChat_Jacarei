# Fluxo de conversa, deduplicação e controle de estado

## 1. Problemas identificados

### Mensagens duplicadas

A Evolution API pode reenviar o mesmo webhook quando:

- O processamento demora;
- A API não recebe resposta HTTP `2xx` rapidamente;
- O gateway possui mais de uma instância;
- O mesmo evento é tratado por mais de um listener;
- O identificador da mensagem não é persistido corretamente.

A deduplicação deve usar o identificador original da mensagem recebido em:

```ts
event.data.key.id
```

Nunca deve ser usada apenas a combinação de telefone e texto, pois o usuário pode enviar o mesmo texto legitimamente várias vezes.

### Resposta da primeira pergunta sendo usada na segunda

Esse comportamento normalmente ocorre quando:

- O estado da conversa é salvo depois do processamento, e não antes;
- Duas mensagens são processadas simultaneamente;
- A primeira opção continua pendente na sessão;
- O fluxo usa uma variável global ou cache compartilhado;
- A sessão é atualizada com dados antigos;
- O código interpreta qualquer número como resposta da etapa atual;
- A transição de etapa não é feita de forma atômica.

O fluxo precisa funcionar como uma máquina de estados.

---

## 2. Fluxo esperado

Exemplo:

```text
INICIO
  ↓
MENU_PRINCIPAL
  ↓ usuário escolhe 1
CATEGORIA_SELECIONADA
  ↓ sistema envia as opções do problema
PROBLEMA_AGUARDANDO_RESPOSTA
  ↓ usuário escolhe 1
PROBLEMA_SELECIONADO
  ↓ sistema envia orientação
FINALIZADO
```

A opção `1` da primeira etapa não pode ser reutilizada automaticamente na etapa seguinte.

Cada mensagem recebida deve ser processada considerando exclusivamente o estado atual salvo para aquele telefone.

---

## 3. Estado mínimo da conversa

A sessão deve armazenar, no mínimo:

```ts
type ConversationState =
  | 'START'
  | 'MAIN_MENU'
  | 'CATEGORY_MENU'
  | 'PROBLEM_MENU'
  | 'WAITING_DETAILS'
  | 'FINISHED';

interface ConversationSession {
  phone: string;
  state: ConversationState;
  selectedCategoryId?: string;
  selectedProblemId?: string;
  lastInboundMessageId?: string;
  version: number;
  updatedAt: Date;
}
```

Não é recomendado controlar a etapa somente com variáveis em memória.

---

## 4. Deduplicação obrigatória

A tabela de mensagens recebidas deve possuir um identificador único:

```sql
ALTER TABLE inbound_messages
ADD CONSTRAINT inbound_messages_external_id_unique
UNIQUE (external_id);
```

O processamento deve tentar registrar a mensagem antes de executar qualquer regra de negócio:

```ts
const externalId = event.data?.key?.id;

if (!externalId) {
  return;
}

if (event.data?.key?.fromMe) {
  return;
}

const inserted = await inboundMessageRepository.insertIfNotExists({
  externalId,
  phone,
  payload: event,
});

if (!inserted) {
  // Webhook duplicado: não processar novamente
  return;
}

// Somente depois desta etapa executar o fluxo
await conversationService.processMessage({
  phone,
  text,
  externalId,
});
```

O método `insertIfNotExists` deve ser baseado em `INSERT ... ON CONFLICT DO NOTHING`, e não em:

```ts
if (!(await exists(id))) {
  await insert(id);
}
```

Esse padrão permite condição de corrida quando dois webhooks chegam simultaneamente.

---

## 5. Controle correto da etapa

O handler deve carregar o estado atual e encaminhar a mensagem para uma única etapa:

```ts
const session = await sessionRepository.findByPhone(phone);

switch (session?.state) {
  case 'MAIN_MENU':
    return handleMainMenu(session, text);

  case 'CATEGORY_MENU':
    return handleCategoryMenu(session, text);

  case 'PROBLEM_MENU':
    return handleProblemMenu(session, text);

  case 'WAITING_DETAILS':
    return handleDetails(session, text);

  default:
    return startConversation(phone);
}
```

Cada handler deve:

1. Validar a opção recebida;
2. Salvar a seleção;
3. Alterar o estado;
4. Enviar a próxima mensagem.

Exemplo:

```ts
async function handleMainMenu(session: ConversationSession, text: string) {
  const option = normalizeOption(text);

  const category = await categoryRepository.findByOption(option);

  if (!category) {
    return sendMessage(
      session.phone,
      'Opção inválida. Escolha uma opção do menu.'
    );
  }

  await sessionRepository.update(session.phone, {
    selectedCategoryId: category.id,
    selectedProblemId: null,
    state: 'PROBLEM_MENU',
    version: session.version + 1,
  });

  return sendProblemMenu(session.phone, category.id);
}
```

A seleção deve ser salva antes do envio da próxima mensagem. Assim, se o envio falhar ou o webhook for repetido, o estado da conversa continua correto.

---

## 6. Proteção contra concorrência

Duas mensagens do mesmo usuário não devem ser processadas ao mesmo tempo.

Opções recomendadas:

### Opção A: lock no banco

Usar uma transação com bloqueio da sessão:

```sql
SELECT *
FROM conversation_sessions
WHERE phone = $1
FOR UPDATE;
```

Dentro da mesma transação:

1. Buscar a sessão;
2. Validar o estado;
3. Atualizar o estado;
4. Confirmar a transação.

### Opção B: fila por telefone

Enviar cada mensagem para uma fila agrupada por telefone:

```text
telefone 5511999999999
  mensagem 1
  mensagem 2
  mensagem 3
```

A fila garante que somente uma mensagem daquele usuário seja processada por vez.

### Opção C: lock distribuído

Se houver múltiplas instâncias do gateway, usar Redis com uma chave semelhante a:

```text
conversation-lock:5511999999999
```

O lock deve possuir expiração para evitar sessões travadas.

---

## 7. Não reutilizar a mensagem anterior

Evite códigos como:

```ts
session.lastMessage || text
```

ou:

```ts
const answer = session.pendingOption ?? text;
```

Isso pode fazer a opção da etapa anterior ser usada novamente.

A mensagem atual deve ser recebida explicitamente pelo handler:

```ts
await processCurrentStep({
  state: session.state,
  currentText: text,
});
```

Depois de consumir uma seleção, limpe os campos temporários:

```ts
await sessionRepository.update(phone, {
  pendingOption: null,
  lastInboundMessageId: externalId,
  state: 'PROBLEM_MENU',
});
```

---

## 8. Evitar mensagens duplicadas de saída

Além de deduplicar mensagens recebidas, as mensagens enviadas também podem ser protegidas.

Antes de enviar, gerar uma chave idempotente:

```ts
const responseKey = `${externalId}:${session.state}:problem-menu`;
```

Registrar essa chave em uma tabela:

```sql
CREATE TABLE outbound_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  content TEXT NOT NULL,
  sent_at TIMESTAMP NULL
);
```

Fluxo:

```ts
const created = await outboundRepository.createIfNotExists({
  idempotencyKey: responseKey,
  phone,
  content,
});

if (!created) {
  return;
}

await evolutionApi.sendText(phone, content);
```

Isso evita que o mesmo processamento envie duas respostas iguais.

---

## 9. Logs necessários

Adicionar logs com:

- Telefone;
- `externalId`;
- Estado anterior;
- Texto recebido;
- Estado novo;
- Identificador da resposta enviada.

Exemplo:

```ts
logger.info({
  phone,
  externalId,
  text,
  previousState: session.state,
  nextState: nextState,
}, 'Processando mensagem da conversa');
```

Para mensagens duplicadas:

```ts
logger.warn({
  phone,
  externalId,
}, 'Webhook duplicado ignorado');
```

Para concorrência:

```ts
logger.warn({
  phone,
  externalId,
}, 'Mensagem aguardando processamento da sessão');
```

---

## 10. Checklist de correção

- [ ] Usar `event.data.key.id` como identificador da mensagem.
- [ ] Ignorar eventos com `fromMe = true`.
- [ ] Criar índice único em `inbound_messages.external_id`.
- [ ] Registrar a mensagem antes de chamar o LLM.
- [ ] Persistir o estado por telefone.
- [ ] Atualizar o estado antes de enviar a próxima mensagem.
- [ ] Limpar opções temporárias depois de consumi-las.
- [ ] Processar somente uma mensagem por telefone por vez.
- [ ] Não usar variáveis globais para controlar o estado.
- [ ] Criar idempotência para mensagens de saída.
- [ ] Verificar se há mais de um consumidor do mesmo webhook.
- [ ] Rebuildar e reiniciar todos os containers após alterar o código.

---

## 11. Diagnóstico do problema atual

Para confirmar a causa, verificar nos logs se a mesma mensagem possui o mesmo `externalId`.

Se houver dois processamentos com o mesmo ID:

```text
externalId abc123 → processado duas vezes
```

o problema é deduplicação ou concorrência.

Se os IDs forem diferentes, mas o texto for igual:

```text
externalId abc123 → opção 1
externalId def456 → opção 1
```

o problema está no controle de estado ou no usuário recebendo uma mensagem repetida.

Também verificar se o estado muda corretamente:

```text
MAIN_MENU → PROBLEM_MENU → PROBLEM_SELECTED
```

Se continuar como:

```text
MAIN_MENU → MAIN_MENU
```

ou:

```text
PROBLEM_MENU → MAIN_MENU
```

o erro está na persistência ou na transição da sessão.